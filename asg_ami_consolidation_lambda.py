import os
import glob
import re
import traceback
import urllib.parse
import urllib.request
import pandas as pd
import boto3
from datetime import datetime, timedelta, timezone
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.utils import COMMASPACE, formatdate

# AWS clients
s3_client = boto3.client('s3')
s3_resource = boto3.resource('s3')
ses_client = boto3.client('ses')

def check_no_ami_or_not_found(ami_id, ami_status, ami_name, status_val):
    """
    Validates whether an ASG has No AMI Available or an AMI Status of 'Not Found' / 'Missing' / 'Unconfigured'.
    Checks across AMI ID, AMI Status, AMI Name, and Compliance Status columns.
    """
    ami_id_str = str(ami_id).strip().upper() if pd.notna(ami_id) else ''
    ami_status_str = str(ami_status).strip().upper() if pd.notna(ami_status) else ''
    ami_name_str = str(ami_name).strip().upper() if pd.notna(ami_name) else ''
    status_str = str(status_val).strip().upper() if pd.notna(status_val) else ''

    no_ami_id = (
        not ami_id_str 
        or ami_id_str in ['N/A', 'UNKNOWN', 'NOT FOUND', 'NOT_FOUND', 'NONE', 'NULL', 'NO AMI', 'NAN']
        or 'NOT FOUND' in ami_id_str 
        or 'MISSING' in ami_id_str
    )

    bad_ami_status = (
        ami_status_str in ['NOT FOUND', 'NOT_FOUND', 'N/A', 'UNKNOWN', 'MISSING', 'DELETED', 'UNCONFIGURED', 'NONE', 'NULL']
        or 'NOT FOUND' in ami_status_str
        or 'MISSING' in ami_status_str
        or 'DELETED' in ami_status_str
    )

    bad_ami_name = ('NOT FOUND' in ami_name_str) or ('MISSING' in ami_name_str)
    bad_status = ('NOT FOUND' in status_str) or ('MISSING' in status_str)

    return no_ami_id or bad_ami_status or bad_ami_name or bad_status

def generate_missing_ami_mailto(account_name, missing_asgs, current_time_str):
    """
    Dynamically constructs an Outlook-compatible mailto: URI for a specific AWS Account.
    Builds a clean, aligned plain-text table pre-populating missing AMI records
    and leaving 'Owner Details' blank for user entry.
    """
    subject = f"Action Required - Missing AMI Details - {account_name}"
    
    header_lines = [
        f"Action Required: Missing / Unavailable AMIs for AWS Account: {account_name}",
        f"Audit Execution Timestamp: {current_time_str}",
        "Please provide Owner Details for each missing record listed below and reply:\n"
    ]
    
    col_acc = "Account"
    col_asg = "ASG Name"
    col_inst = "Instance ID"
    col_ami = "AMI ID"
    col_status = "AMI Status"
    col_region = "Region"
    col_owner = "Owner Details"

    table_header = f"{col_acc:<12} | {col_asg:<30} | {col_inst:<15} | {col_ami:<22} | {col_status:<15} | {col_region:<12} | {col_owner:<20}"
    divider = "-" * 138

    body_lines = header_lines + [table_header, divider]

    for row in missing_asgs:
        acc = str(row.get('Account Name', account_name))[:12]
        asg = str(row.get('ASG Name', 'N/A'))[:30]
        inst = str(row.get('Instance ID', 'N/A'))[:15]
        ami = str(row.get('Current AMI ID', 'N/A'))[:22]
        status = str(row.get('AMI Status', 'Not Found'))[:15]
        reg = str(row.get('Region', 'N/A'))[:12]
        owner = ""

        line = f"{acc:<12} | {asg:<30} | {inst:<15} | {ami:<22} | {status:<15} | {reg:<12} | {owner}"
        body_lines.append(line)

    body_lines.append(divider)
    body_lines.append("\nRegards,\nCloud Studio-Automation Team\nWipro Limited")

    full_body_text = "\n".join(body_lines)

    encoded_subject = urllib.parse.quote(subject)
    encoded_body = urllib.parse.quote(full_body_text)

    return f"mailto:?subject={encoded_subject}&body={encoded_body}"

def lambda_handler(event, context):
    """
    AWS Lambda handler for consolidating ASG AMI Inventory Reports from S3:
    s3://hl-common-artifacts/Reports-Consolidation-Wipro/ASGReports/
    """
    if not os.path.isdir('/tmp'):
        os.mkdir('/tmp')
    
    for file in glob.glob('/tmp/*'):
        try:
            if os.path.isfile(file):
                os.remove(file)
                print(f"Cleaned up cached file: {file}")
        except Exception as e:
            print(f"Error cleaning up {file}: {e}")

    bucket_name = 'hl-common-artifacts'
    possible_prefixes = [
        'Reports-Consolidation-Wipro/ASGReports/',
        'Reports-Consolidation-Wipro/ASG Reports/'
    ]

    downloaded_files = []
    bucket = s3_resource.Bucket(bucket_name)
    matching_objs = []

    print(f"Scanning S3 bucket '{bucket_name}' for ASGReports ...")

    try:
        for s3_prefix in possible_prefixes:
            print(f"Checking S3 prefix: {s3_prefix}")
            objs = list(bucket.objects.filter(Prefix=s3_prefix))
            for obj in objs:
                key = obj.key
                filename = key.split('/')[-1]
                key_lower = key.lower()
                
                if filename and not filename.startswith('~$') and not 'consolidated' in key_lower and key_lower.endswith(('.csv', '.xlsx', '.xls')):
                    matching_objs.append(obj)
            
            if matching_objs:
                print(f"Found {len(matching_objs)} ASG report file(s) under prefix: {s3_prefix}")
                break
    except Exception as e:
        print(f"Error listing S3 objects: {e}")
        traceback.print_exc()

    for obj in matching_objs:
        unique_local_name = obj.key.replace('/', '_').replace(' ', '_')
        local_path = f'/tmp/{unique_local_name}'
        print(f"Downloading: {obj.key} -> {local_path}")
        try:
            bucket.download_file(obj.key, local_path)
            downloaded_files.append(unique_local_name)
        except Exception as e:
            print(f"Failed to download {obj.key}: {e}")

    os.chdir('/tmp/')
    report_files = [f for f in downloaded_files if os.path.exists(f)]
    print(f"Downloaded report files ready for processing: {len(report_files)}")

    ist_timezone = timezone(timedelta(hours=5, minutes=30))
    current_datetime = datetime.now(ist_timezone)
    current_date = current_datetime.date()
    formatted_date = current_datetime.strftime('%d %B %Y')
    formatted_time = current_datetime.strftime('%I:%M %p IST')
    date_str = current_date.strftime('%Y%m%d')

    sender = 'report@hdfclife.com'
    receiver = ['shivam.32@wipro.com']

    # HIGH-RELIABILITY CORPORATE LOGO URLS
    wipro_logo_url = "https://www.wipro.com/content/dam/nexus/en/wipro-logo-new-og-502x263.jpg"
    aws_logo_url = "https://a0.awsstatic.com/main/images/logos/aws_logo_smile_1200x630.png"

    if not report_files:
        print("⚠️ No ASG report files found in s3://hl-common-artifacts/Reports-Consolidation-Wipro/ASGReports/")
        
        warning_html = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; }}
                .alert-box {{ background-color: #fff3cd; border-left: 4px solid #856404; padding: 10px 14px; margin: 12px 0; border-radius: 4px; }}
            </style>
        </head>
        <body style="background-color: #f1f5f9; padding: 15px;">
            <table width="700" align="center" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border-radius:8px; padding:20px; border:1px solid #cbd5e1;">
                <tr>
                    <td>
                        <p style="margin:0 0 10px 0; font-size:13px; color:#334155;">Hi Cloud Engineering Team,<br><br>Greetings of the day!<br><br>This is an automated notification for the <b>HDFCL AWS ASG AMI Inventory Report</b>.</p>
                        <div class="alert-box">
                            <b>⚠️ Notice: No ASG Report files (.csv / .xlsx) found in S3 bucket.</b><br><br>
                            <b>Expected S3 URI:</b> <code>s3://{bucket_name}/Reports-Consolidation-Wipro/ASGReports/</code><br>
                            <b>Execution Timestamp:</b> {current_date} at {formatted_time}<br><br>
                            Please ensure account ASG inventory reports are uploaded prior to the scheduled execution.
                        </div>
                        <div style="margin-top:16px; padding-top:10px; border-top:1px solid #e2e8f0; font-size:12px; color:#475569;">
                            <img src="{wipro_logo_url}" alt="Wipro Logo" style="height:30px; width:auto; display:block; border:0; margin-bottom:6px;"><br>
                            <strong>Regards,</strong><br><br>
                            <strong>Cloud Studio-Automation Team</strong><br>
                            <em>Wipro Limited</em>
                        </div>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
        
        msg = MIMEMultipart()
        msg['From'] = sender
        msg['To'] = COMMASPACE.join(receiver)
        msg['Date'] = formatdate(localtime=True)
        msg['Subject'] = f"HDFCL AWS ASG AMI Inventory Report || {formatted_date} [No Files Found]"
        msg.attach(MIMEText(warning_html, 'html'))
        
        try:
            ses_client.send_raw_email(
                SourceArn='arn:aws:ses:ap-south-1:760735698823:identity/hdfclife.com',
                RawMessage={'Data': msg.as_string()}
            )
            print("Diagnostic email sent via SES.")
        except Exception as e:
            print("Error sending SES email:", e)
            
        return {
            'statusCode': 200,
            'body': f'No ASG report files found in s3://{bucket_name}/Reports-Consolidation-Wipro/ASGReports/'
        }

    # PROCESS REPORT FILES
    consolidated_dfs = []
    processed_asgs = set()
    
    ami_available_rows = []
    no_ami_rows = []

    account_stats = {}

    for file in report_files:
        print(f"\nProcessing file: {file}")
        sheets_dict = {}
        try:
            if file.lower().endswith(('.xlsx', '.xls')):
                sheets_dict = pd.read_excel(file, sheet_name=None)
            elif file.lower().endswith('.csv'):
                try:
                    csv_df = pd.read_csv(file, encoding='utf-8', on_bad_lines='skip', low_memory=False)
                except Exception:
                    csv_df = pd.read_csv(file, encoding='latin-1', on_bad_lines='skip', low_memory=False)
                sheets_dict = {'CSV_Report': csv_df}
        except Exception as e:
            print(f"Error reading file {file}: {e}")
            traceback.print_exc()
            continue
        
        file_account_name = file.split('-ASG')[0] if '-ASG' in file else file.split('-AMI')[0] if '-AMI' in file else file.split('.')[0]
        file_account_name = file_account_name.replace('Reports-Consolidation-Wipro_', '').replace('ASGReports_', '').replace('ASG_Reports_', '')
        file_account_name = file_account_name.split('_')[0].split('-')[0]

        for sheet_name, sheet_df in sheets_dict.items():
            if sheet_df is None or sheet_df.empty:
                continue

            for col in ['Serial No', 'S.No', 'S. No.', 'Unnamed: 0']:
                if col in sheet_df.columns:
                    sheet_df = sheet_df.drop(columns=[col])

            normalized_columns = {str(col).strip().lower(): col for col in sheet_df.columns}

            def detect_col(possible_names):
                for name in possible_names:
                    if name.lower() in normalized_columns:
                        return normalized_columns[name.lower()]
                return None

            account_col = detect_col(['account name', 'account', 'account id', 'account_name', 'aws account'])
            asg_col = detect_col(['asg name', 'auto scaling group', 'autoscalinggroupname', 'asg_name', 'asg', 'auto scaling group name', 'name'])
            instance_col = detect_col(['instance id', 'instance_id', 'instanceid', 'instance', 'instance type'])
            region_col = detect_col(['region', 'aws region', 'aws_region'])
            ami_col = detect_col(['ami id', 'current ami id', 'ami_id', 'image id', 'current ami', 'ami', 'image_id'])
            ami_status_col = detect_col(['ami status', 'ami_status', 'image status', 'image_status', 'status', 'compliance status', 'compliance_status'])
            ami_name_col = detect_col(['ami name', 'ami_name', 'image name', 'image_name'])
            lt_lc_col = detect_col(['launch template name', 'launch template', 'launch configuration', 'lt/lc name', 'launch template / configuration', 'template name', 'lc name', 'launch_template'])
            creation_date_col = detect_col(['ami creation date', 'creation date', 'created on', 'ami age', 'created date', 'image creation date', 'creation_date'])
            remarks_col = detect_col(['remarks', 'recommendation', 'action required', 'notes', 'comment', 'reason'])

            for index, row in sheet_df.iterrows():
                try:
                    account_name = file_account_name
                    if account_col:
                        row_account_val = row.get(account_col)
                        if pd.notna(row_account_val) and str(row_account_val).strip() != '':
                            account_name = str(row_account_val).strip()
                    
                    asg_name = str(row.get(asg_col, 'N/A') if asg_col else 'N/A').strip()
                    instance_id = str(row.get(instance_col, 'N/A') if instance_col else 'N/A').strip()
                    region = str(row.get(region_col, 'N/A') if region_col else 'N/A').strip()
                    ami_id = str(row.get(ami_col, 'N/A') if ami_col else 'N/A').strip()
                    ami_status_val = str(row.get(ami_status_col, 'N/A') if ami_status_col else 'N/A').strip()
                    ami_name_val = str(row.get(ami_name_col, 'N/A') if ami_name_col else 'N/A').strip()
                    lt_lc_name = str(row.get(lt_lc_col, 'N/A') if lt_lc_col else 'N/A').strip()
                    creation_date = row.get(creation_date_col, 'N/A') if creation_date_col else 'N/A'
                    remarks = str(row.get(remarks_col, 'N/A') if remarks_col else 'N/A').strip()

                    asg_lower = asg_name.lower()
                    lt_lc_lower = lt_lc_name.lower()

                    if 'eks' in asg_lower or 'eks' in lt_lc_lower:
                        workload_type = 'EKS'
                    elif 'ecs' in asg_lower or 'ecs' in lt_lc_lower:
                        workload_type = 'ECS'
                    else:
                        workload_type = 'EC2'

                    asg_identifier = f"{asg_name}_{ami_id}_{account_name}_{region}"
                    if asg_identifier in processed_asgs and asg_name != 'N/A':
                        continue
                    processed_asgs.add(asg_identifier)

                    if account_name not in account_stats:
                        account_stats[account_name] = {
                            'total': 0, 'ami_available': 0, 'no_ami': 0
                        }
                    account_stats[account_name]['total'] += 1

                    if pd.notna(creation_date) and creation_date != 'N/A':
                        try:
                            if hasattr(creation_date, 'strftime'):
                                creation_date = creation_date.strftime('%Y-%m-%d')
                            else:
                                parsed_dt = pd.to_datetime(creation_date, errors='coerce')
                                if not pd.isna(parsed_dt):
                                    creation_date = parsed_dt.strftime('%Y-%m-%d')
                        except Exception:
                            creation_date = str(creation_date).strip()

                    is_no_ami_or_not_found = check_no_ami_or_not_found(
                        ami_id=ami_id, 
                        ami_status=ami_status_val, 
                        ami_name=ami_name_val, 
                        status_val=ami_status_val
                    )

                    if is_no_ami_or_not_found:
                        display_ami = ami_id if (ami_id and ami_id.upper() not in ['N/A', 'UNKNOWN', 'NOT FOUND', 'NONE']) else 'UNCONFIGURED / MISSING'
                        rem_text = f"AMI ID ({ami_id}) status is Not Found in EC2" if 'NOT FOUND' in ami_status_val.upper() else ('No Current AMI ID configured' if remarks == 'N/A' else remarks)

                        row_data = {
                            'Account Name': account_name,
                            'ASG Name': asg_name,
                            'Instance ID': instance_id,
                            'Workload': workload_type,
                            'Region': region,
                            'AMI Availability': 'NO AMI / NOT FOUND',
                            'Current AMI ID': display_ami,
                            'AMI Status': ami_status_val if ami_status_val != 'N/A' else 'Not Found',
                            'AMI Name': ami_name_val,
                            'Launch Template / LC': lt_lc_name,
                            'AMI Creation Date': str(creation_date),
                            'Remarks': rem_text
                        }
                        no_ami_rows.append(row_data)
                        account_stats[account_name]['no_ami'] += 1
                        print(f"      🚨 NO AMI / NOT FOUND DETECTED: {asg_name} ({account_name}) - AMI ID: {ami_id} - Status: {ami_status_val}")
                    else:
                        row_data = {
                            'Account Name': account_name,
                            'ASG Name': asg_name,
                            'Instance ID': instance_id,
                            'Workload': workload_type,
                            'Region': region,
                            'AMI Availability': 'AMI AVAILABLE',
                            'Current AMI ID': ami_id,
                            'AMI Status': ami_status_val if ami_status_val != 'N/A' else 'Found',
                            'AMI Name': ami_name_val,
                            'Launch Template / LC': lt_lc_name,
                            'AMI Creation Date': str(creation_date),
                            'Remarks': remarks
                        }
                        ami_available_rows.append(row_data)
                        account_stats[account_name]['ami_available'] += 1

                except Exception as row_err:
                    print(f"Error processing row {index} in {file}: {row_err}")

            try:
                consolidated_dfs.append(sheet_df.drop_duplicates())
            except Exception as concat_err:
                print(f"Error appending dataframe for {file}: {concat_err}")

    def remove_duplicates(row_list):
        seen = set()
        unique_rows = []
        for r in row_list:
            identifier = f"{r['Account Name']}_{r['ASG Name']}_{r['Current AMI ID']}_{r['Region']}"
            if identifier not in seen:
                seen.add(identifier)
                unique_rows.append(r)
        return unique_rows

    no_ami_rows = remove_duplicates(no_ami_rows)
    ami_available_rows = remove_duplicates(ami_available_rows)

    no_ami_count = len(no_ami_rows)
    ami_available_count = len(ami_available_rows)
    total_evaluated_asgs = no_ami_count + ami_available_count

    ami_available_pct = round((ami_available_count / total_evaluated_asgs * 100), 1) if total_evaluated_asgs > 0 else 0.0
    no_ami_pct = round((no_ami_count / total_evaluated_asgs * 100), 1) if total_evaluated_asgs > 0 else 0.0

    # DYNAMIC PLATFORM STATISTICS COMPUTATION (MATHEMATICALLY VERIFIED & DEDUPLICATED)
    platform_stats = {
        'EC2': {'total': 0, 'available': 0, 'missing': 0},
        'EKS': {'total': 0, 'available': 0, 'missing': 0},
        'ECS': {'total': 0, 'available': 0, 'missing': 0}
    }

    for row in ami_available_rows:
        w_type = row.get('Workload', 'EC2')
        if w_type not in platform_stats:
            platform_stats[w_type] = {'total': 0, 'available': 0, 'missing': 0}
        platform_stats[w_type]['total'] += 1
        platform_stats[w_type]['available'] += 1

    for row in no_ami_rows:
        w_type = row.get('Workload', 'EC2')
        if w_type not in platform_stats:
            platform_stats[w_type] = {'total': 0, 'available': 0, 'missing': 0}
        platform_stats[w_type]['total'] += 1
        platform_stats[w_type]['missing'] += 1

    # Compute platform-level availability percentages
    for p_key, p_val in platform_stats.items():
        tot = p_val['total']
        avail = p_val['available']
        p_val['pct'] = round((avail / tot * 100), 1) if tot > 0 else 0.0

    # MATHEMATICAL VERIFICATION ASSERTION PRINTING
    calc_total = sum(p['total'] for p in platform_stats.values())
    calc_avail = sum(p['available'] for p in platform_stats.values())
    calc_missing = sum(p['missing'] for p in platform_stats.values())

    print(f"Mathematical Verification Check:")
    print(f"  Total ASGs: {total_evaluated_asgs} == Platform Sum Total: {calc_total}")
    print(f"  Available ASGs: {ami_available_count} == Platform Sum Available: {calc_avail}")
    print(f"  Missing ASGs: {no_ami_count} == Platform Sum Missing: {calc_missing}")
    print(f"  Platform Breakdown: {platform_stats}")

    # Save local consolidated Excel file
    output_path = '/tmp/ASG-AMI-Consolidated.xlsx'
    if consolidated_dfs:
        try:
            final_df = pd.concat(consolidated_dfs, ignore_index=True).drop_duplicates()
            final_df.to_excel(output_path, index=False)
        except Exception as e:
            print(f"Error saving consolidated excel: {e}")
            pd.DataFrame(no_ami_rows + ami_available_rows).to_excel(output_path, index=False)
    else:
        pd.DataFrame(no_ami_rows + ami_available_rows).to_excel(output_path, index=False)

    # Upload consolidated output quietly to S3
    s3_output_key = f"Reports-Consolidation-Wipro/ASGReports/Consolidated/ASG-AMI-Consolidated-{date_str}.xlsx"
    try:
        print(f"Uploading consolidated output quietly to s3://{bucket_name}/{s3_output_key} ...")
        s3_client.upload_file(output_path, bucket_name, s3_output_key)
    except Exception as upload_err:
        print("⚠️ Error uploading report to S3:", upload_err)

    # OUTLOOK-NATIVE SUMMARY TABLE MATRIX WITH EXACT 6695 PILL STYLING
    current_time_str = f"{formatted_date} at {formatted_time}"

    account_breakdown_rows_html = ""
    if account_stats:
        row_idx = 0
        for acc_name, stats in sorted(account_stats.items()):
            row_idx += 1
            row_bg = "#ffffff" if row_idx % 2 != 0 else "#f8fafc"
            acc_avail_pct = round((stats['ami_available'] / stats['total'] * 100), 1) if stats['total'] > 0 else 0.0
            
            acc_missing_rows = [r for r in no_ami_rows if r['Account Name'] == acc_name]
            acc_missing_count = len(acc_missing_rows)

            if acc_missing_count == 0:
                acc_badge = '<span style="background-color:#2e7d32; color:#ffffff; font-weight:700; padding:6px 14px; border-radius:12px; font-size:10px; text-transform:uppercase; display:inline-block; letter-spacing:0.5px;">100% AMI AVAILABLE</span>'
                no_ami_disp = '<b style="color: #64748b;">0</b>'
            else:
                mailto_url = generate_missing_ami_mailto(acc_name, acc_missing_rows, current_time_str)
                btn_label = f"✉️ {acc_missing_count} MISSING / NOT FOUND"
                
                acc_badge = f'<a href="{mailto_url}" target="_blank" style="text-decoration:none;"><span style="background-color:#c84b14; color:#ffffff !important; font-weight:700; padding:6px 14px; border-radius:12px; font-size:10px; text-transform:uppercase; display:inline-block; letter-spacing:0.5px; box-shadow:0 2px 4px rgba(200,75,20,0.3);">{btn_label}</span></a>'
                no_ami_disp = f'<b style="color: #c84b14;">{acc_missing_count}</b>'

            account_breakdown_rows_html += f"""
                <tr style="background-color: {row_bg};">
                    <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; color:#0284c7; font-weight:800; font-size:12px;">{acc_name}</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; color:#334155; font-weight:700; font-size:12px; text-align:center;">{stats['total']}</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; color:#2e7d32; font-weight:700; font-size:12px; text-align:center;">{stats['ami_available']}</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; font-size:12px; text-align:center;">{no_ami_disp}</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; color:#334155; font-weight:700; font-size:12px; text-align:center;">{acc_avail_pct}%</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; text-align:center;">{acc_badge}</td>
                </tr>
            """

    no_ami_table_rows_html = ""
    if no_ami_rows:
        row_idx = 0
        for entry in no_ami_rows:
            row_idx += 1
            row_bg = "#ffffff" if row_idx % 2 != 0 else "#f8fafc"
            workload_bg = '#f3e8ff' if entry['Workload'] == 'EKS' else '#ccfbf1' if entry['Workload'] == 'ECS' else '#e0f2fe'
            workload_color = '#6b21a8' if entry['Workload'] == 'EKS' else '#0f766e' if entry['Workload'] == 'ECS' else '#0369a1'
            workload_badge = f'<span style="background-color:{workload_bg}; color:{workload_color}; font-weight:700; padding:3px 8px; border-radius:4px; font-size:9px;">{entry["Workload"]}</span>'
            
            no_ami_table_rows_html += f"""
                <tr style="background-color: {row_bg};">
                    <td style="padding:9px 12px; border-bottom:1px solid #e2e8f0; color:#0284c7; font-weight:800; font-size:12px;">{entry['Account Name']}</td>
                    <td style="padding:9px 12px; border-bottom:1px solid #e2e8f0; color:#0f172a; font-weight:700; font-size:12px;">{entry['ASG Name']}</td>
                    <td style="padding:9px 12px; border-bottom:1px solid #e2e8f0; text-align:center;">{workload_badge}</td>
                    <td style="padding:9px 12px; border-bottom:1px solid #e2e8f0; color:#334155; font-size:12px;">{entry['Region']}</td>
                    <td style="padding:9px 12px; border-bottom:1px solid #e2e8f0; color:#c84b14; font-weight:800; font-size:12px;">{entry['Current AMI ID']}</td>
                    <td style="padding:9px 12px; border-bottom:1px solid #e2e8f0; font-family:monospace; font-size:11px; color:#475569;">{entry['Launch Template / LC']}</td>
                    <td style="padding:9px 12px; border-bottom:1px solid #e2e8f0; text-align:center;"><span style="background-color:#c84b14; color:#ffffff; font-weight:700; padding:4px 8px; border-radius:4px; font-size:9px;">NOT FOUND</span></td>
                    <td style="padding:9px 12px; border-bottom:1px solid #e2e8f0; color:#334155; font-size:11px;">{entry['Remarks']}</td>
                </tr>
            """
    else:
        no_ami_table_rows_html = """
            <tr>
                <td colspan="8" style="text-align: center; padding: 14px; color: #2e7d32; font-weight: 700; font-size: 12px;">
                    🎉 Excellent! 100% of Auto Scaling Groups have active AMI IDs available in AWS.
                </td>
            </tr>
        """

    ami_available_table_rows_html = ""
    if ami_available_rows:
        row_idx = 0
        for entry in ami_available_rows[:50]:
            row_idx += 1
            row_bg = "#ffffff" if row_idx % 2 != 0 else "#f8fafc"
            workload_bg = '#f3e8ff' if entry['Workload'] == 'EKS' else '#ccfbf1' if entry['Workload'] == 'ECS' else '#e0f2fe'
            workload_color = '#6b21a8' if entry['Workload'] == 'EKS' else '#0f766e' if entry['Workload'] == 'ECS' else '#0369a1'
            workload_badge = f'<span style="background-color:{workload_bg}; color:{workload_color}; font-weight:700; padding:3px 8px; border-radius:4px; font-size:9px;">{entry["Workload"]}</span>'
            
            ami_available_table_rows_html += f"""
                <tr style="background-color: {row_bg};">
                    <td style="padding:9px 12px; border-bottom:1px solid #e2e8f0; color:#0284c7; font-weight:800; font-size:12px;">{entry['Account Name']}</td>
                    <td style="padding:9px 12px; border-bottom:1px solid #e2e8f0; color:#0f172a; font-weight:700; font-size:12px;">{entry['ASG Name']}</td>
                    <td style="padding:9px 12px; border-bottom:1px solid #e2e8f0; text-align:center;">{workload_badge}</td>
                    <td style="padding:9px 12px; border-bottom:1px solid #e2e8f0; color:#334155; font-size:12px;">{entry['Region']}</td>
                    <td style="padding:9px 12px; border-bottom:1px solid #e2e8f0; font-family:monospace; font-size:11px; color:#334155;">{entry['Current AMI ID']}</td>
                    <td style="padding:9px 12px; border-bottom:1px solid #e2e8f0; font-family:monospace; font-size:11px; color:#475569;">{entry['Launch Template / LC']}</td>
                    <td style="padding:9px 12px; border-bottom:1px solid #e2e8f0; text-align:center;"><span style="background-color:#2e7d32; color:#ffffff; font-weight:700; padding:4px 8px; border-radius:4px; font-size:9px;">AMI AVAILABLE</span></td>
                    <td style="padding:9px 12px; border-bottom:1px solid #e2e8f0; color:#334155; font-size:11px;">{entry['AMI Creation Date']}</td>
                </tr>
            """
        if len(ami_available_rows) > 50:
            ami_available_table_rows_html += f"""
                <tr><td colspan="8" style="text-align: center; padding: 8px; color: #64748b; font-style: italic; font-size: 11px;">Showing top 50 of {len(ami_available_rows)} entries with AMI available. Download full Excel report for complete inventory.</td></tr>
            """
    else:
        ami_available_table_rows_html = """
            <tr><td colspan="8" style="text-align: center; padding: 14px; color: #64748b; font-size: 12px;">No ASGs with AMI available found.</td></tr>
        """

    # PLATFORM BREAKDOWN TABLE HTML
    platform_rows_html = f"""
        <tr style="background-color: #ffffff;">
            <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: #0284c7; font-size: 12px;">🖥️ EC2 Workloads</td>
            <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #334155; font-size: 12px; text-align: center;">{platform_stats['EC2']['total']}</td>
            <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #2e7d32; font-size: 12px; text-align: center;">{platform_stats['EC2']['available']}</td>
            <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: {'#c84b14' if platform_stats['EC2']['missing'] > 0 else '#64748b'}; font-size: 12px; text-align: center;">{platform_stats['EC2']['missing']}</td>
            <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: #0f172a; font-size: 12px; text-align: center;">{platform_stats['EC2']['pct']}%</td>
        </tr>
        <tr style="background-color: #f8fafc;">
            <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: #9333ea; font-size: 12px;">☸️ EKS Workloads</td>
            <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #334155; font-size: 12px; text-align: center;">{platform_stats['EKS']['total']}</td>
            <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #2e7d32; font-size: 12px; text-align: center;">{platform_stats['EKS']['available']}</td>
            <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: {'#c84b14' if platform_stats['EKS']['missing'] > 0 else '#64748b'}; font-size: 12px; text-align: center;">{platform_stats['EKS']['missing']}</td>
            <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: #0f172a; font-size: 12px; text-align: center;">{platform_stats['EKS']['pct']}%</td>
        </tr>
        <tr style="background-color: #ffffff;">
            <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: #0d9488; font-size: 12px;">🐳 ECS Workloads</td>
            <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #334155; font-size: 12px; text-align: center;">{platform_stats['ECS']['total']}</td>
            <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #2e7d32; font-size: 12px; text-align: center;">{platform_stats['ECS']['available']}</td>
            <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: {'#c84b14' if platform_stats['ECS']['missing'] > 0 else '#64748b'}; font-size: 12px; text-align: center;">{platform_stats['ECS']['missing']}</td>
            <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: #0f172a; font-size: 12px; text-align: center;">{platform_stats['ECS']['pct']}%</td>
        </tr>
    """

    # COMPLETE OUTLOOK-NATIVE ENTERPRISE HTML DASHBOARD TEMPLATE
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, Helvetica, sans-serif; color: #1e293b; background-color: #f1f5f9; margin: 0; padding: 15px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
                <td align="center">
                    <table width="920" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; border: 1px solid #cbd5e1; overflow: hidden;">
                        
                        <!-- Enterprise Header Banner -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #0b192c 0%, #1e3e62 50%, #004085 100%); padding: 22px 26px; color: #ffffff;">
                                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #38bdf8; margin-bottom: 4px;">AWS ASG AMI INVENTORY REPORT</div>
                                <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff;">Consolidated Automated Inventory</h1>
                                <p style="margin: 6px 0 0 0; font-size: 12px; color: #cbd5e1;"><b>Audit Date:</b> {formatted_date} &nbsp;|&nbsp; <b>Audit Time:</b> {formatted_time}</p>
                            </td>
                        </tr>

                        <!-- Content Area -->
                        <tr>
                            <td style="padding: 22px 26px;">
                                
                                <!-- Concise Introduction -->
                                <p style="margin: 0 0 16px 0; font-size: 13px; color: #334155; line-height: 1.5;">
                                    Hi Cloud Engineering Team,<br><br>
                                    Please find below the consolidated AWS Auto Scaling Group AMI inventory report.<br>
                                    The report provides account-level AMI availability and highlights ASGs where the AMI is missing or unavailable.<br><br>
                                    Click the orange <b>MISSING / NOT FOUND</b> button to compose an Outlook email with the affected ASG details and update the Owner Details before sending.
                                </p>

                                <!-- Executive Top Summary KPI Cards -->
                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 18px;">
                                    <tr>
                                        <td width="32%" align="center" style="background:#f8fafc; padding:12px 8px; border:1px solid #e2e8f0; border-top:4px solid #0284c7; border-radius:6px;">
                                            <div style="font-size:26px; font-weight:800; color:#0284c7; line-height:1;">{total_evaluated_asgs}</div>
                                            <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; margin-top:4px;">Evaluated ASGs</div>
                                        </td>
                                        <td width="2%"></td>
                                        <td width="32%" align="center" style="background:#f0fdf4; padding:12px 8px; border:1px solid #dcfce7; border-top:4px solid #2e7d32; border-radius:6px;">
                                            <div style="font-size:26px; font-weight:800; color:#2e7d32; line-height:1;">{ami_available_count}</div>
                                            <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; margin-top:4px;">AMI Available</div>
                                            <div style="font-size:11px; font-weight:700; color:#2e7d32; margin-top:2px;">{ami_available_pct}% Rate</div>
                                        </td>
                                        <td width="2%"></td>
                                        <td width="32%" align="center" style="background:#fff7ed; padding:12px 8px; border:1px solid #ffedd5; border-top:4px solid #c84b14; border-radius:6px;">
                                            <div style="font-size:26px; font-weight:800; color:#c84b14; line-height:1;">{no_ami_count}</div>
                                            <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; margin-top:4px;">AMI Not Found</div>
                                            <div style="font-size:11px; font-weight:700; color:#c84b14; margin-top:2px;">{no_ami_pct}% Risk</div>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Platform Breakdown Table -->
                                <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 16px; margin-bottom: 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; text-transform: uppercase;">
                                    📊 AMI Availability By Platform
                                </div>

                                <table width="100%" cellpadding="0" cellspacing="0" border="1" bordercolor="#e2e8f0" style="border-collapse: collapse; margin-bottom: 20px;">
                                    <thead>
                                        <tr style="background-color: #1e293b; color: #ffffff;">
                                            <th style="padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase;">Platform Workload</th>
                                            <th style="padding: 8px 12px; text-align: center; font-size: 10px; font-weight: 700; text-transform: uppercase;">Total ASGs</th>
                                            <th style="padding: 8px 12px; text-align: center; font-size: 10px; font-weight: 700; text-transform: uppercase;">AMI Available</th>
                                            <th style="padding: 8px 12px; text-align: center; font-size: 10px; font-weight: 700; text-transform: uppercase;">AMI Missing</th>
                                            <th style="padding: 8px 12px; text-align: center; font-size: 10px; font-weight: 700; text-transform: uppercase;">Availability %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {platform_rows_html}
                                    </tbody>
                                </table>

                                <!-- AWS Account-Level AMI Summary Table -->
                                <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 18px; margin-bottom: 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; text-transform: uppercase;">
                                    <img src="{aws_logo_url}" alt="AWS Logo" style="height: 16px; width: auto; vertical-align: middle; margin-right: 6px; border: 0;">
                                    <span style="vertical-align: middle;">AWS Account-Level AMI Summary</span>
                                </div>

                                <table width="100%" cellpadding="0" cellspacing="0" border="1" bordercolor="#e2e8f0" style="border-collapse: collapse; margin-bottom: 20px;">
                                    <thead>
                                        <tr style="background-color: #1e293b; color: #ffffff;">
                                            <th style="padding: 9px 12px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase;">AWS Account Name</th>
                                            <th style="padding: 9px 12px; text-align: center; font-size: 10px; font-weight: 700; text-transform: uppercase;">Total ASGs</th>
                                            <th style="padding: 9px 12px; text-align: center; font-size: 10px; font-weight: 700; text-transform: uppercase;">AMI Available</th>
                                            <th style="padding: 9px 12px; text-align: center; font-size: 10px; font-weight: 700; text-transform: uppercase;">No AMI / Not Found</th>
                                            <th style="padding: 9px 12px; text-align: center; font-size: 10px; font-weight: 700; text-transform: uppercase;">AMI Availability %</th>
                                            <th style="padding: 9px 12px; text-align: center; font-size: 10px; font-weight: 700; text-transform: uppercase;">Account Status (Click to Compose Email)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {account_breakdown_rows_html}
                                    </tbody>
                                </table>

                                <!-- Detailed Missing AMIs Section -->
                                <div style="background-color: #fff7ed; border-left: 4px solid #c84b14; padding: 10px 14px; border-radius: 4px; margin-bottom: 12px; border: 1px solid #ffedd5;">
                                    <div style="font-weight: 800; color: #c84b14; font-size: 13px;">🚨 ASGs With No AMI Available or AMI Not Found ({no_ami_count})</div>
                                    <p style="margin: 2px 0 0 0; font-size: 11px; color: #9a3412;">The following Auto Scaling Groups have unconfigured AMIs or their configured AMI ID status is <b>Not Found</b> in AWS EC2.</p>
                                </div>

                                <table width="100%" cellpadding="0" cellspacing="0" border="1" bordercolor="#e2e8f0" style="border-collapse: collapse; margin-bottom: 20px;">
                                    <thead>
                                        <tr style="background-color: #1e293b; color: #ffffff;">
                                            <th style="padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase;">AWS Account</th>
                                            <th style="padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase;">ASG Name</th>
                                            <th style="padding: 8px 10px; text-align: center; font-size: 10px; font-weight: 700; text-transform: uppercase;">Workload</th>
                                            <th style="padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase;">Region</th>
                                            <th style="padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase;">Current AMI ID</th>
                                            <th style="padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase;">Launch Template / LC</th>
                                            <th style="padding: 8px 10px; text-align: center; font-size: 10px; font-weight: 700; text-transform: uppercase;">Status</th>
                                            <th style="padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase;">Remarks / Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {no_ami_table_rows_html}
                                    </tbody>
                                </table>

                                <!-- Detailed Active AMIs Section -->
                                <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 18px; margin-bottom: 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; text-transform: uppercase;">
                                    ✅ ASGs With Valid AMI Available ({ami_available_count})
                                </div>

                                <table width="100%" cellpadding="0" cellspacing="0" border="1" bordercolor="#e2e8f0" style="border-collapse: collapse; margin-bottom: 20px;">
                                    <thead>
                                        <tr style="background-color: #1e293b; color: #ffffff;">
                                            <th style="padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase;">AWS Account</th>
                                            <th style="padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase;">ASG Name</th>
                                            <th style="padding: 8px 10px; text-align: center; font-size: 10px; font-weight: 700; text-transform: uppercase;">Workload</th>
                                            <th style="padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase;">Region</th>
                                            <th style="padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase;">Current AMI ID</th>
                                            <th style="padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase;">Launch Template / LC</th>
                                            <th style="padding: 8px 10px; text-align: center; font-size: 10px; font-weight: 700; text-transform: uppercase;">Status</th>
                                            <th style="padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase;">AMI Creation Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ami_available_table_rows_html}
                                    </tbody>
                                </table>

                                <!-- Wipro Corporate Signature Footer with Inline CID/HTTPS Image -->
                                <div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #475569;">
                                    <img src="cid:wipro_logo" alt="Wipro Logo" style="height: 32px; width: auto; display: block; border: 0; margin-bottom: 8px;"><br>
                                    <strong>Regards,</strong><br><br>
                                    <strong>Cloud Studio-Automation Team</strong><br>
                                    <em>Wipro Limited</em>
                                </div>

                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    msg = MIMEMultipart('related')
    msg['From'] = sender
    msg['To'] = COMMASPACE.join(receiver)
    msg['Date'] = formatdate(localtime=True)
    msg['Subject'] = f"HDFCL AWS ASG AMI Inventory Report || {formatted_date}"
    
    msg_alternative = MIMEMultipart('alternative')
    msg.attach(msg_alternative)
    msg_alternative.attach(MIMEText(html_body, 'html'))

    # ATTACH WIPRO LOGO AS INLINE CID MIME IMAGE (OUTLOOK SAFE)
    try:
        req = urllib.request.Request(wipro_logo_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            wipro_logo_data = resp.read()
            img_part = MIMEImage(wipro_logo_data)
            img_part.add_header('Content-ID', '<wipro_logo>')
            img_part.add_header('Content-Disposition', 'inline', filename='wipro_logo.jpg')
            msg.attach(img_part)
            print("Wipro logo attached successfully as inline CID MIME Image.")
    except Exception as img_err:
        print("⚠️ Could not attach inline CID image, HTML will use HTTPS URL fallback:", img_err)

    if os.path.exists(output_path):
        with open(output_path, 'rb') as f:
            msg.attach(MIMEApplication(f.read(), Name='ASG-AMI-Consolidated.xlsx'))

    try:
        response = ses_client.send_raw_email(
            SourceArn='arn:aws:ses:ap-south-1:760735698823:identity/hdfclife.com',
            RawMessage={'Data': msg.as_string()}
        )
        print("Email sent successfully:", response)
        return {
            'statusCode': 200,
            'body': f"Inventory Report successfully generated & emailed to {receiver}. Total ASGs: {total_evaluated_asgs}, AMI Available: {ami_available_count}, No AMI/Not Found: {no_ami_count}, Platform Breakdown: {platform_stats}."
        }
    except Exception as e:
        print("Error sending email via SES:", e)
        traceback.print_exc()
        return {'statusCode': 500, 'body': f"Error sending email: {str(e)}"}
