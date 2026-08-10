import os
import glob
import re
import traceback
import pandas as pd
import boto3
from datetime import datetime, timedelta, timezone
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import COMMASPACE, formatdate

# AWS clients
s3_client = boto3.client('s3')
s3_resource = boto3.resource('s3')
ses_client = boto3.client('ses')

def lambda_handler(event, context):
    """
    AWS Lambda handler for consolidating ASG AMI Inventory Reports from S3:
    s3://hl-common-artifacts/Reports-Consolidation-Wipro/ASGReports/
    
    Simple & Direct Classification:
    1. ASGs with AMI Available (Valid AMI ID present).
    2. ASGs with No AMI Available (Unconfigured / Missing / Not Found).
    3. Excluded Container Workloads (EKS & ECS ASGs counted separately).
    """
    # Ensure /tmp exists and clean cached files
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
                
                # Exclude output consolidation folder & temp files
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

    # Time calculations (IST timezone UTC+5:30)
    ist_timezone = timezone(timedelta(hours=5, minutes=30))
    current_datetime = datetime.now(ist_timezone)
    current_date = current_datetime.date()
    formatted_date = current_datetime.strftime('%d %B %Y')
    formatted_time = current_datetime.strftime('%I:%M %p IST')
    date_str = current_date.strftime('%Y%m%d')

    sender = 'report@hdfclife.com'
    receiver = ['shivam.32@wipro.com']

    # IF NO REPORT FILES FOUND: Send notification email
    if not report_files:
        print("⚠️ No ASG report files found in s3://hl-common-artifacts/Reports-Consolidation-Wipro/ASGReports/")
        
        warning_html = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; color: #333; }}
                .alert-box {{ background-color: #fff3cd; border-left: 5px solid #856404; padding: 15px; margin: 20px 0; border-radius: 6px; }}
                .signature {{ margin-top: 30px; border-top: 1px solid #ddd; padding-top: 15px; }}
            </style>
        </head>
        <body>
            <p>Hi Shivam,<br><br>This is an automated notification for the <b>HDFC AWS ASG AMI Inventory Weekly Report</b>.</p>
            <div class="alert-box">
                <b>⚠️ Notice: No ASG Report files (.csv / .xlsx) found in S3 bucket.</b><br><br>
                <b>Expected S3 URI:</b> <code>s3://{bucket_name}/Reports-Consolidation-Wipro/ASGReports/</code><br>
                <b>Execution Timestamp:</b> {current_date} at {formatted_time}<br><br>
                Please ensure account ASG inventory reports are uploaded prior to the scheduled execution.
            </div>
            <div class="signature">
                <img src="https://www.wipro.com/content/dam/nexus/en/wipro-logo-new-og-502x263.jpg" alt="Wipro Logo" style="height: 30px;"><br>
                <strong>Regards,</strong><br>
                <strong>Cloud Studio Automation Team</strong><br>
                <em>Wipro Limited</em>
            </div>
        </body>
        </html>
        """
        
        msg = MIMEMultipart()
        msg['From'] = sender
        msg['To'] = COMMASPACE.join(receiver)
        msg['Date'] = formatdate(localtime=True)
        msg['Subject'] = f"HDFC AWS ASG AMI Inventory Report || {formatted_date} [No Files Found]"
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
    
    # Simple Two-Category Data Lists
    ami_available_rows = []    # Category 1: ASGs with AMI Available
    no_ami_rows = []           # Category 2: ASGs with No AMI Available
    
    # EKS & ECS Container Exclusion Trackers
    processed_eks_asgs = set()
    processed_ecs_asgs = set()

    # Multi-Account Statistics Aggregator
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
        
        # Extract account name fallback from filename
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
            region_col = detect_col(['region', 'aws region', 'aws_region'])
            ami_col = detect_col(['ami id', 'current ami id', 'ami_id', 'image id', 'current ami', 'ami', 'image_id'])
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
                    region = str(row.get(region_col, 'N/A') if region_col else 'N/A').strip()
                    ami_id = str(row.get(ami_col, 'N/A') if ami_col else 'N/A').strip()
                    lt_lc_name = str(row.get(lt_lc_col, 'N/A') if lt_lc_col else 'N/A').strip()
                    creation_date = row.get(creation_date_col, 'N/A') if creation_date_col else 'N/A'
                    remarks = str(row.get(remarks_col, 'N/A') if remarks_col else 'N/A').strip()

                    # EXCLUSION OF CONTAINER WORKLOADS (EKS & ECS)
                    asg_lower = asg_name.lower()
                    lt_lc_lower = lt_lc_name.lower()
                    is_eks = ('eks' in asg_lower or 'eks' in lt_lc_lower)
                    is_ecs = ('ecs' in asg_lower or 'ecs' in lt_lc_lower)

                    if is_eks:
                        processed_eks_asgs.add(f"{asg_name}_{account_name}_{region}")
                        continue
                    elif is_ecs:
                        processed_ecs_asgs.add(f"{asg_name}_{account_name}_{region}")
                        continue

                    # Deduplication key for EC2 ASGs
                    asg_identifier = f"{asg_name}_{ami_id}_{account_name}_{region}"
                    if asg_identifier in processed_asgs and asg_name != 'N/A':
                        continue
                    processed_asgs.add(asg_identifier)

                    # Initialize Account Aggregations
                    if account_name not in account_stats:
                        account_stats[account_name] = {
                            'total': 0, 'ami_available': 0, 'no_ami': 0
                        }

                    account_stats[account_name]['total'] += 1

                    # Clean creation date string
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

                    ami_upper = ami_id.upper()

                    # DIRECT CLASSIFICATION: HAS AMI VS NO AMI
                    has_no_ami = (
                        ami_upper in ['N/A', 'UNKNOWN', 'NOT FOUND', 'NOT_FOUND', 'NONE', '', 'NULL', 'NO AMI', 'NAN'] 
                        or 'NOT FOUND' in ami_upper 
                        or 'MISSING' in ami_upper 
                        or 'NO AMI' in ami_upper
                    )

                    if has_no_ami:
                        rem_text = 'No Current AMI ID configured' if remarks == 'N/A' else remarks
                        row_data = {
                            'Account Name': account_name,
                            'ASG Name': asg_name,
                            'Region': region,
                            'AMI Availability': 'NO AMI AVAILABLE',
                            'Current AMI ID': 'UNCONFIGURED / MISSING',
                            'Launch Template / LC': lt_lc_name,
                            'AMI Creation Date': str(creation_date),
                            'Remarks': rem_text
                        }
                        no_ami_rows.append(row_data)
                        account_stats[account_name]['no_ami'] += 1
                    else:
                        row_data = {
                            'Account Name': account_name,
                            'ASG Name': asg_name,
                            'Region': region,
                            'AMI Availability': 'AMI AVAILABLE',
                            'Current AMI ID': ami_id,
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

    # Deduplicate row lists
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

    eks_count = len(processed_eks_asgs)
    ecs_count = len(processed_ecs_asgs)
    
    no_ami_count = len(no_ami_rows)
    ami_available_count = len(ami_available_rows)
    total_evaluated_asgs = no_ami_count + ami_available_count

    ami_available_pct = round((ami_available_count / total_evaluated_asgs * 100), 1) if total_evaluated_asgs > 0 else 0.0
    no_ami_pct = round((no_ami_count / total_evaluated_asgs * 100), 1) if total_evaluated_asgs > 0 else 0.0

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

    # UPLOAD TO S3 & GENERATE PRESIGNED LINK
    download_url = ""
    s3_output_key = f"Reports-Consolidation-Wipro/ASGReports/Consolidated/ASG-AMI-Consolidated-{date_str}.xlsx"
    
    try:
        print(f"Uploading consolidated output to s3://{bucket_name}/{s3_output_key} ...")
        s3_client.upload_file(output_path, bucket_name, s3_output_key)
        
        download_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': s3_output_key},
            ExpiresIn=604800
        )
        print("✅ Generated S3 Presigned Download URL:", download_url)
    except Exception as upload_err:
        print("⚠️ Error uploading report to S3 / generating presigned URL:", upload_err)
        traceback.print_exc()
        download_url = f"https://s3.console.aws.amazon.com/s3/object/{bucket_name}?prefix={s3_output_key}"

    print(f"Audit Summary - Total: {total_evaluated_asgs}, AMI Available: {ami_available_count} ({ami_available_pct}%), No AMI: {no_ami_count} ({no_ami_pct}%), EKS: {eks_count}, ECS: {ecs_count}")

    # AESTHETIC & MODERN HTML STYLING
    html_style = """
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background-color: #f1f5f9; margin: 0; padding: 0; line-height: 1.5; }
        .email-container { max-width: 1000px; margin: 25px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(15,23,42,0.08); border: 1px solid #cbd5e1; }
        .header { background: linear-gradient(135deg, #0b192c 0%, #1e3e62 50%, #004085 100%); color: #ffffff; padding: 30px 35px; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; }
        .header p { margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; font-weight: 500; }

        .content { padding: 35px; }

        /* KPI Dashboard Grid */
        .kpi-grid { display: table; width: 100%; margin: 20px 0 30px 0; table-layout: fixed; border-spacing: 10px 0; }
        .kpi-card { display: table-cell; text-align: center; padding: 18px 10px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; vertical-align: middle; }
        .kpi-card .number { font-size: 28px; font-weight: 800; line-height: 1.1; }
        .kpi-card .label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; margin-top: 6px; }
        .kpi-card .subtext { font-size: 11px; font-weight: 600; margin-top: 2px; }

        .kpi-blue { border-top: 5px solid #0284c7; } .kpi-blue .number { color: #0284c7; }
        .kpi-green { border-top: 5px solid #16a34a; } .kpi-green .number { color: #16a34a; } .kpi-green .subtext { color: #16a34a; }
        .kpi-orange { border-top: 5px solid #ea580c; } .kpi-orange .number { color: #ea580c; } .kpi-orange .subtext { color: #ea580c; }
        .kpi-purple { border-top: 5px solid #9333ea; } .kpi-purple .number { color: #9333ea; }
        .kpi-teal { border-top: 5px solid #0d9488; } .kpi-teal .number { color: #0d9488; }

        /* Action Download Button */
        .btn-container { text-align: center; margin: 25px 0 35px 0; }
        .download-btn {
            background: linear-gradient(135deg, #004085 0%, #002752 100%);
            color: #ffffff !important;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 700;
            font-size: 14px;
            display: inline-block;
            box-shadow: 0 10px 20px rgba(0, 64, 133, 0.25);
            letter-spacing: 0.3px;
        }

        /* Callout Box */
        .callout-box { background: #fff7ed; border-left: 5px solid #ea580c; padding: 18px 22px; border-radius: 10px; margin-bottom: 25px; border: 1px solid #ffedd5; }
        .callout-title { font-weight: 800; color: #9a3412; font-size: 14px; margin-bottom: 6px; }

        /* Section Titles */
        .section-header { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 35px; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.5px; }

        /* Tables */
        table { border-collapse: separate; border-spacing: 0; width: 100%; margin-bottom: 25px; font-size: 12px; background: #ffffff; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; }
        th { background-color: #1e293b; color: #ffffff; padding: 12px 14px; text-align: left; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        td { padding: 11px 14px; border-bottom: 1px solid #f1f5f9; color: #334155; }
        tr:last-child td { border-bottom: none; }
        tr:nth-child(even) { background-color: #f8fafc; }
        tr:hover { background-color: #f1f5f9; }

        /* Badges */
        .badge { font-weight: 700; padding: 4px 9px; border-radius: 6px; color: #ffffff; font-size: 10px; text-transform: uppercase; display: inline-block; }
        .badge-orange { background-color: #ea580c; }
        .badge-green { background-color: #16a34a; }

        .account-name { font-weight: 800; color: #0284c7; }
        .asg-name { font-weight: 700; color: #0f172a; }

        /* Signature */
        .signature { margin-top: 40px; padding-top: 25px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #475569; }
        .signature img { height: 32px; margin-bottom: 10px; }
    </style>
    """

    # Pre-calculate Account Level Breakdown Table
    account_breakdown_html = ""
    if account_stats:
        for acc_name, stats in sorted(account_stats.items()):
            acc_avail_pct = round((stats['ami_available'] / stats['total'] * 100), 1) if stats['total'] > 0 else 0.0
            
            if stats['no_ami'] == 0:
                acc_badge = '<span class="badge badge-green">100% AMI AVAILABLE</span>'
                no_ami_disp = '<b style="color: #64748b;">0</b>'
            else:
                acc_badge = f'<span class="badge badge-orange">{stats["no_ami"]} MISSING AMI</span>'
                no_ami_disp = f'<b style="color: #ea580c;">{stats["no_ami"]}</b>'

            account_breakdown_html += f"""
                <tr>
                    <td><span class="account-name">{acc_name}</span></td>
                    <td><b>{stats['total']}</b></td>
                    <td><b style="color: #16a34a;">{stats['ami_available']}</b></td>
                    <td>{no_ami_disp}</td>
                    <td><b>{acc_avail_pct}%</b></td>
                    <td>{acc_badge}</td>
                </tr>
            """

    # Pre-calculate ASGs with No AMI Available Table
    no_ami_table_html = ""
    if no_ami_rows:
        for entry in no_ami_rows:
            no_ami_table_html += f"""
                <tr>
                    <td><span class="account-name">{entry['Account Name']}</span></td>
                    <td><span class="asg-name">{entry['ASG Name']}</span></td>
                    <td>{entry['Region']}</td>
                    <td><b style="color: #ea580c;">UNCONFIGURED / MISSING</b></td>
                    <td><code>{entry['Launch Template / LC']}</code></td>
                    <td><span class="badge badge-orange">NO AMI AVAILABLE</span></td>
                    <td>{entry['Remarks']}</td>
                </tr>
            """
    else:
        no_ami_table_html = """
            <tr>
                <td colspan="7" style="text-align: center; padding: 18px; color: #16a34a; font-weight: 700;">
                    🎉 Excellent! 100% of Auto Scaling Groups have active AMI IDs configured.
                </td>
            </tr>
        """

    # Pre-calculate ASGs with AMI Available Table (Top 50)
    ami_available_table_html = ""
    if ami_available_rows:
        for entry in ami_available_rows[:50]:
            ami_available_table_html += f"""
                <tr>
                    <td><span class="account-name">{entry['Account Name']}</span></td>
                    <td><span class="asg-name">{entry['ASG Name']}</span></td>
                    <td>{entry['Region']}</td>
                    <td><code>{entry['Current AMI ID']}</code></td>
                    <td><code>{entry['Launch Template / LC']}</code></td>
                    <td><span class="badge badge-green">AMI AVAILABLE</span></td>
                    <td>{entry['AMI Creation Date']}</td>
                    <td>{entry['Remarks']}</td>
                </tr>
            """
        if len(ami_available_rows) > 50:
            ami_available_table_html += f"""
                <tr><td colspan="8" style="text-align: center; padding: 12px; color: #64748b; font-style: italic;">Showing top 50 of {len(ami_available_rows)} entries with AMI available. Download full Excel report for complete inventory.</td></tr>
            """
    else:
        ami_available_table_html = """
            <tr><td colspan="8" style="text-align: center; padding: 18px; color: #64748b;">No ASGs with AMI available found.</td></tr>
        """

    wipro_logo = """
    <div class="signature">
        <img src="https://www.wipro.com/content/dam/nexus/en/wipro-logo-new-og-502x263.jpg" alt="Wipro Logo"><br>
        <strong>Regards,</strong><br>
        <strong>Cloud Studio Automation Team</strong><br>
        <em>Wipro Limited</em>
    </div>
    """

    download_button_html = f"""
    <div class="btn-container">
        <a href="{download_url}" class="download-btn" target="_blank">
            📥 Download Consolidated ASG AMI Report (.xlsx)
        </a>
        <br><span style="font-size: 11px; color: #64748b; margin-top: 6px; display: inline-block;"><i>Direct S3 Presigned Download • Valid for 7 Days</i></span>
    </div>
    """ if download_url else ""

    html_body = f"""
    <html>
    <head>{html_style}</head>
    <body>
        <div class="email-container">
            <div class="header">
                <h1>HDFC AWS ASG AMI Inventory Audit</h1>
                <p>Consolidated Automated Report || Audit Date: {formatted_date} ({formatted_time})</p>
            </div>

            <div class="content">
                <p>Hi Shivam,<br><br>Please find the consolidated inventory report for Auto Scaling Groups across AWS accounts below. <i>(Note: EKS and ECS Auto Scaling Groups have been excluded and counted separately)</i>.</p>

                <!-- KPI Cards Dashboard -->
                <div class="kpi-grid">
                    <div class="kpi-card kpi-blue">
                        <div class="number">{total_evaluated_asgs}</div>
                        <div class="label">Evaluated EC2 ASGs</div>
                    </div>
                    <div class="kpi-card kpi-green">
                        <div class="number">{ami_available_count}</div>
                        <div class="label">ASGs with AMI Available</div>
                        <div class="subtext">{ami_available_pct}% Availability</div>
                    </div>
                    <div class="kpi-card kpi-orange">
                        <div class="number">{no_ami_count}</div>
                        <div class="label">ASGs with No AMI Available</div>
                        <div class="subtext">{no_ami_pct}% Unconfigured</div>
                    </div>
                    <div class="kpi-card kpi-purple">
                        <div class="number">{eks_count}</div>
                        <div class="label">Excluded EKS ASGs</div>
                    </div>
                    <div class="kpi-card kpi-teal">
                        <div class="number">{ecs_count}</div>
                        <div class="label">Excluded ECS ASGs</div>
                    </div>
                </div>

                {download_button_html}

                <!-- Account Level Breakdown Matrix -->
                <div class="section-header">🏢 AWS Account-Level AMI Summary</div>
                <table>
                    <thead>
                        <tr>
                            <th>AWS Account Name</th>
                            <th>Total ASGs</th>
                            <th>AMI Available</th>
                            <th>No AMI Available</th>
                            <th>AMI Availability %</th>
                            <th>Account Status</th>
                        </tr>
                    </thead>
                    <tbody>{account_breakdown_html}</tbody>
                </table>

                <!-- Callout Box & Table: ASGs With No AMI Available -->
                <div class="callout-box">
                    <div class="callout-title">🚨 ASGs With No AMI Available ({no_ami_count})</div>
                    <p style="margin: 0; font-size: 12px; color: #9a3412;">The following Auto Scaling Groups do not have a valid Current AMI ID configured in their Launch Template or Launch Configuration.</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>AWS Account</th>
                            <th>ASG Name</th>
                            <th>Region</th>
                            <th>Current AMI ID</th>
                            <th>Launch Template / LC</th>
                            <th>Status</th>
                            <th>Remarks</th>
                        </tr>
                    </thead>
                    <tbody>{no_ami_table_html}</tbody>
                </table>

                <!-- Section: ASGs with AMI Available -->
                <div class="section-header">✅ ASGs With AMI Available ({ami_available_count})</div>
                <table>
                    <thead>
                        <tr>
                            <th>AWS Account</th>
                            <th>ASG Name</th>
                            <th>Region</th>
                            <th>Current AMI ID</th>
                            <th>Launch Template / LC</th>
                            <th>Status</th>
                            <th>AMI Creation Date</th>
                            <th>Remarks</th>
                        </tr>
                    </thead>
                    <tbody>{ami_available_table_html}</tbody>
                </table>

                {wipro_logo}
            </div>
        </div>
    </body>
    </html>
    """

    msg = MIMEMultipart()
    msg['From'] = sender
    msg['To'] = COMMASPACE.join(receiver)
    msg['Date'] = formatdate(localtime=True)
    msg['Subject'] = f"HDFC AWS ASG AMI Inventory Report || {formatted_date}"
    msg.attach(MIMEText(html_body, 'html'))

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
            'body': f"Inventory Report successfully generated & emailed to {receiver}. Total Evaluated ASGs: {total_evaluated_asgs}, AMI Available: {ami_available_count}, No AMI: {no_ami_count}, Excluded EKS: {eks_count}, Excluded ECS: {ecs_count}. Download URL: {download_url}"
        }
    except Exception as e:
        print("Error sending email via SES:", e)
        traceback.print_exc()
        return {'statusCode': 500, 'body': f"Error sending email: {str(e)}"}
