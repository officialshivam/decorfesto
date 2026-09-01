import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAdminDashboard } from '../services/adminDashboardApi';
import { deriveDashboard } from '../services/dashboardMetrics';
import { formatDateTime, formatINR, formatUptime } from '../services/format';
import {
  fetchAdminChargesApi,
  updateAdminChargeApi,
  createAdminChargeApi,
  deleteAdminChargeApi,
  getStoredCharges,
} from '../services/chargeService';

function StatusDot({ tone }) {
  return <span className={`dash-dot dash-dot--${tone || 'neutral'}`} aria-hidden="true" />;
}

function KpiCard({ label, value, sub, tone, to }) {
  const content = (
    <div className="dash-kpi">
      <div className="dash-kpi__top">
        <span className="dash-kpi__label">{label}</span>
        {tone ? <StatusDot tone={tone} /> : null}
      </div>
      <strong className="dash-kpi__value">{value}</strong>
      {sub ? <span className="dash-kpi__sub">{sub}</span> : null}
    </div>
  );

  if (!to) return content;
  return <Link to={to} className="dash-kpi__link" aria-label={`${label}: ${value}`}>{content}</Link>;
}

function ChartCard({ title, subtitle, children, actions }) {
  return (
    <section className="dash-card dash-card--span">
      <div className="dash-card__header">
        <div>
          <h2 className="dash-card__title">{title}</h2>
          {subtitle ? <p className="dash-card__subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="dash-card__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function OrdersBarChart({ series }) {
  const maxOrders = Math.max(1, ...series.orders);
  const maxRevenue = Math.max(1, ...series.revenue);
  const barWidth = 100 / series.labels.length;
  const height = 132;

  return (
    <div className="dash-chart">
      <div className="dash-chart__row">
        <div className="dash-chart__label">ORDERS</div>
        <svg viewBox={`0 0 700 ${height}`} className="dash-chart__svg" role="img" aria-label="Orders over the last 7 days">
          {series.labels.map((label, index) => {
            const value = series.orders[index];
            const barHeight = value === 0 ? 2 : Math.max(4, (value / maxOrders) * (height - 28));
            const x = index * 7 + barWidth / 2;
            return (
              <g key={`${label}-${index}`}>
                <line x1={x} y1="2" x2={x} y2={height - 6} stroke="rgba(148,163,184,0.12)" strokeWidth="1" />
                <rect
                  x={x - barWidth * 0.18}
                  width={barWidth * 0.36}
                  y={height - barHeight}
                  height={barHeight}
                  rx="3"
                  fill="var(--dash-blue)"
                />
                <text x={x} y={height - 8} textAnchor="middle" className="dash-chart__bar-label">{value || ''}</text>
                <text x={x} y={height + 12} textAnchor="middle" className="dash-chart__axis-label">{label}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="dash-chart__row">
        <div className="dash-chart__label">REVENUE</div>
        <svg viewBox={`0 0 700 ${height}`} className="dash-chart__svg" role="img" aria-label="Revenue over the last 7 days">
          {series.labels.map((label, index) => {
            const value = series.revenue[index];
            const barHeight = value === 0 ? 2 : Math.max(4, (value / maxRevenue) * (height - 28));
            const x = index * 7 + barWidth / 2;
            const y = height - barHeight + 6;
            const path = index === 0
              ? `M ${x} ${y}`
              : `L ${x} ${y}`;
            return (
              <g key={`rev-${label}-${index}`} className="dash-spark">
                <text x={x} y={y - 6} textAnchor="middle" className="dash-chart__bar-label">{value ? `₹${formatINR(value)}` : ''}</text>
                {index === 0 ? <path d={`M ${x} ${y} L ${x} ${y + 0.01}`} fill="none" stroke="var(--dash-accent)" strokeWidth="2" /> : <path d={path} fill="none" stroke="var(--dash-accent)" strokeWidth="2" />}
                <circle cx={x} cy={y} r="3" fill="var(--dash-accent)" />
                <text x={x} y={height - 2} textAnchor="middle" className="dash-chart__axis-label">{label}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function RevenueLineChart({ series }) {
  const maxRevenue = Math.max(1, ...series.revenue);
  const height = 160;
  const points = series.revenue
    .map((value, index) => `${index * 14},${height - 20 - (value / maxRevenue) * (height - 40)}`)
    .join(' ');
  const areaPoints = `0,${height - 20} ${points} 700,${height - 20}`;

  return (
    <div className="dash-chart">
      <svg viewBox={`0 0 700 ${height}`} className="dash-chart__svg dash-chart__svg--tall" role="img" aria-label="Revenue trend over the last 7 days">
        <defs>
          <linearGradient id="revenueArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--dash-accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--dash-accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#revenueArea)" />
        <polyline points={points} fill="none" stroke="var(--dash-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {series.labels.map((label, index) => (
          <text key={`rev-axis-${label}-${index}`} x={index * 14} y={height - 4} textAnchor="middle" className="dash-chart__axis-label">{label}</text>
        ))}
      </svg>
    </div>
  );
}

function StatusDistribution({ distribution, statusLabels }) {
  const mapped = distribution.map((entry) => ({
    ...entry,
    bucket: (() => {
      const key = String(entry.label || '').toUpperCase();
      if (['REJECTED', 'CANCELLED', 'CANCELED'].includes(key)) return 'cancelled';
      if (['APPROVED', 'ASSIGNED_TO_VENDOR', 'CONFIRMED', 'CONFIRM'].includes(key)) return 'confirmed';
      if (['COMPLETED', 'DELIVERED', 'FULFILLED'].includes(key)) return 'completed';
      return 'pending';
    })(),
  }));

  const total = mapped.reduce((sum, entry) => sum + entry.value, 0);
  const colors = { pending: 'var(--dash-amber)', confirmed: 'var(--dash-blue)', completed: 'var(--dash-green)', cancelled: 'var(--dash-red)' };
  const ordered = ['pending', 'confirmed', 'completed', 'cancelled'];
  let cumulative = 0;
  const segments = ordered
    .map((bucket) => {
      const sum = mapped.filter((entry) => entry.bucket === bucket).reduce((acc, entry) => acc + entry.value, 0);
      const start = cumulative;
      cumulative += sum;
      return { bucket, sum, start };
    })
    .filter((entry) => entry.sum > 0);

  const circumference = 2 * Math.PI * 54;

  return (
    <div className="dash-distribution">
      <div className="dash-donut">
        <svg viewBox="0 0 140 140" role="img" aria-label="Order status distribution">
          <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="14" />
          {total > 0 ? segments.map((segment) => {
            const fraction = segment.sum / total;
            const dash = `${fraction * circumference} ${circumference - fraction * circumference}`;
            const offset = -(segment.start / total) * circumference;
            return (
              <circle
                key={segment.bucket}
                cx="70"
                cy="70"
                r="54"
                fill="none"
                stroke={colors[segment.bucket]}
                strokeWidth="14"
                strokeDasharray={dash}
                strokeDashoffset={offset}
                transform="rotate(-90 70 70)"
                strokeLinecap="butt"
              />
            );
          }) : null}
          <text x="70" y="66" textAnchor="middle" className="dash-donut__value">{total}</text>
          <text x="70" y="86" textAnchor="middle" className="dash-donut__label">orders</text>
        </svg>
      </div>
      <ul className="dash-legend">
        {ordered.map((bucket) => {
          const count = segments.find((entry) => entry.bucket === bucket)?.sum || 0;
          return (
            <li key={bucket}>
              <span className="dash-legend__swatch" style={{ backgroundColor: colors[bucket] }} />
              <span className="dash-legend__label">{statusLabels[bucket]?.label || bucket}</span>
              <strong>{count}</strong>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EmptyState({ title, message }) {
  return (
    <div className="dash-empty">
      <strong>{title}</strong>
      {message ? <span>{message}</span> : null}
    </div>
  );
}

function OrderOpsPanel({ title, orders, emptyMessage, showAmount }) {
  return (
    <section className="dash-card">
      <div className="dash-card__header">
        <h2 className="dash-card__title">{title}</h2>
        <span className="dash-count">{orders.length}</span>
      </div>
      {orders.length === 0 ? <EmptyState title="All clear" message={emptyMessage} /> : (
        <ul className="dash-ops-list">
          {orders.slice(0, 6).map((order) => (
            <li key={order.id} className="dash-ops-item">
              <div className="dash-ops-item__main">
                <Link to={`/admin/orders/${order.id}`} className="dash-ops-item__id">{order.id}</Link>
                <span className="dash-ops-item__meta">{order.customerName} · {order.decoration}</span>
                {order.pincode ? <span className="dash-ops-item__pincode">PIN {order.pincode}</span> : null}
              </div>
              <div className="dash-ops-item__side">
                {order.scheduledDate ? <span className="dash-ops-item__date">{order.scheduledDate}</span> : null}
                {showAmount ? <strong>₹{formatINR(order.amount)}</strong> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ServiceAreaPanel({ dashboard }) {
  const areas = dashboard.serviceAreas.all;
  const uncovered = dashboard.serviceAreas.uncovered || [];
  const availability = dashboard.availability;
  const requested = availability.mostRequested || [];
  const recentChecks = availability.recent || [];

  return (
    <section className="dash-card dash-card--span">
      <div className="dash-card__header">
        <div>
          <h2 className="dash-card__title">Service Area Intelligence</h2>
          <p className="dash-card__subtitle">Coverage, pincode demand and availability check telemetry</p>
        </div>
      </div>

      <div className="dash-kpi-row dash-kpi-row--compact">
        <KpiCard label="Total areas" value={dashboard.serviceAreas.total} />
        <KpiCard label="Serviceable" value={dashboard.serviceAreas.serviceable} tone="green" to="/admin/service-areas" />
        <KpiCard label="Inactive" value={dashboard.serviceAreas.inactive} tone="red" />
        <KpiCard label="Without vendor" value={uncovered.length} tone={uncovered.length ? 'amber' : 'green'} />
        <KpiCard label="Availability checks" value={availability.totalChecks} />
        <KpiCard label="Failed checks" value={availability.failed} tone={availability.failed ? 'amber' : 'neutral'} />
      </div>

      <div className="dash-grid dash-grid--2">
        <div className="dash-subpanel">
          <h3 className="dash-subpanel__title">Area status matrix</h3>
          {areas.length === 0 ? <EmptyState title="No areas" /> : (
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Pincode</th>
                    <th>City</th>
                    <th>Status</th>
                    <th>Lead</th>
                  </tr>
                </thead>
                <tbody>
                  {areas.slice(0, 7).map((area) => (
                    <tr key={area.pincode}>
                      <td><strong>{area.pincode}</strong></td>
                      <td>{area.city || '—'}</td>
                      <td><span className={`dash-pill dash-pill--${area.serviceable && area.active ? 'success' : 'danger'}`}>{area.serviceable && area.active ? 'Serviceable' : 'Inactive'}</span></td>
                      <td>{area.leadTimeHours ? `${area.leadTimeHours}h` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="dash-subpanel">
          <h3 className="dash-subpanel__title">Most requested pincodes</h3>
          {requested.length === 0 ? <EmptyState title="No checks yet" message="Run a pincode check from the customer site." /> : (
            <ul className="dash-rank">
              {requested.map((entry, index) => (
                <li key={entry.pincode} className="dash-rank__item">
                  <span className="dash-rank__index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="dash-rank__label">{entry.pincode}</span>
                  <span className="dash-rank__bar"><span style={{ width: `${Math.max(6, (entry.count / requested[0].count) * 100)}%` }} /></span>
                  <strong className="dash-rank__count">{entry.count}</strong>
                </li>
              ))}
            </ul>
          )}

          <h3 className="dash-subpanel__title dash-subpanel__title--spaced">Recent checks</h3>
          {recentChecks.length === 0 ? <EmptyState title="No checks logged" /> : (
            <ul className="dash-ops-list">
              {recentChecks.slice(0, 5).map((check, index) => (
                <li key={`${check.pincode}-${index}`} className="dash-ops-item">
                  <div className="dash-ops-item__main">
                    <StatusDot tone={check.available ? 'green' : 'red'} />
                    <strong>{check.pincode}</strong>
                    <span className={`dash-pill dash-pill--tiny dash-pill--${check.available ? 'success' : 'danger'}`}>{check.available ? 'Available' : 'Unavailable'}</span>
                  </div>
                  <span className="dash-ops-item__date">{formatDateTime(check.checkedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function VendorPanel({ dashboard }) {
  const vendors = dashboard.vendors.all;
  const coverageByVendor = vendors.map((vendor) => ({
    ...vendor,
    pincodeCount: (vendor.coveragePincodes || []).length,
  }));
  const maxCoverage = Math.max(1, ...coverageByVendor.map((vendor) => vendor.pincodeCount));

  return (
    <section className="dash-card dash-card--span">
      <div className="dash-card__header">
        <div>
          <h2 className="dash-card__title">Vendor Operations</h2>
          <p className="dash-card__subtitle">Capacity, coverage and attention flags</p>
        </div>
      </div>

      <div className="dash-kpi-row dash-kpi-row--compact">
        <KpiCard label="Total vendors" value={dashboard.vendors.total} to="/admin/vendors" />
        <KpiCard label="Active vendors" value={dashboard.vendors.active} tone="green" to="/admin/vendors" />
        <KpiCard label="With upcoming orders" value={dashboard.vendors.withUpcoming.length} tone="blue" />
        <KpiCard label="Requiring attention" value={dashboard.vendors.requiringAttention.length} tone={dashboard.vendors.requiringAttention.length ? 'amber' : 'neutral'} to="/admin/vendors" />
      </div>

      {vendors.length === 0 ? <EmptyState title="No vendors" /> : (
        <div className="dash-vendors">
          {coverageByVendor.map((vendor) => (
            <div key={vendor.id} className="dash-vendor">
              <div className="dash-vendor__head">
                <strong>{vendor.name}</strong>
                <span className={`dash-pill dash-pill--${vendor.status === 'active' || vendor.status === undefined ? 'success' : 'danger'}`}>{vendor.status === 'inactive' ? 'Inactive' : 'Active'}</span>
              </div>
              <div className="dash-vendor__meta">{vendor.contactName || 'No contact'}</div>
              <div className="dash-vendor__coverage">
                <div className="dash-vendor__coverage-bar"><span style={{ width: `${(vendor.pincodeCount / maxCoverage) * 100}%` }} /></div>
                <span className="dash-vendor__coverage-label">{vendor.pincodeCount} pincode{vendor.pincodeCount === 1 ? '' : 's'} covered</span>
              </div>
              <div className="dash-vendor__pincodes">{vendor.coveragePincodes?.join(', ') || 'No coverage'}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function DecorationPanel({ dashboard }) {
  const booked = dashboard.booked || [];
  const categories = dashboard.categories || [];
  const decorations = dashboard.decorations.all;

  return (
    <section className="dash-card dash-card--span">
      <div className="dash-card__header">
        <div>
          <h2 className="dash-card__title">Decoration Analytics</h2>
          <p className="dash-card__subtitle">Catalog, categories and booking demand</p>
        </div>
      </div>

      <div className="dash-kpi-row dash-kpi-row--compact">
        <KpiCard label="Total decorations" value={dashboard.decorations.total} to="/admin/decorations" />
        <KpiCard label="Active decorations" value={dashboard.decorations.active} tone="green" to="/admin/decorations" />
        <KpiCard label="Categories" value={categories.length} to="/admin/categories" />
      </div>

      <div className="dash-grid dash-grid--2">
        <div className="dash-subpanel">
          <h3 className="dash-subpanel__title">Most booked decorations</h3>
          {booked.length === 0 ? <EmptyState title="No bookings yet" message="Orders get recorded when customers place a booking." /> : (
            <ul className="dash-rank">
              {booked.map((entry, index) => (
                <li key={entry.name} className="dash-rank__item">
                  <span className="dash-rank__index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="dash-rank__label dash-rank__label--long">{entry.name}</span>
                  <span className="dash-rank__bar"><span style={{ width: `${Math.max(6, (entry.bookings / booked[0].bookings) * 100)}%` }} /></span>
                  <strong className="dash-rank__count">{entry.bookings}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="dash-subpanel">
          <h3 className="dash-subpanel__title">Album categories</h3>
          {categories.length === 0 ? <EmptyState title="No categories" /> : (
            <ul className="dash-tags">
              {categories.map((category) => (
                <li key={category.id} className="dash-tag">{category.name}</li>
              ))}
            </ul>
          )}

          <h3 className="dash-subpanel__title dash-subpanel__title--spaced">Low visibility items</h3>
          {decorations.length === 0 ? <EmptyState title="No decorations" /> : (
            <ul className="dash-ops-list">
              {decorations.filter((decoration) => decoration.active === false).slice(0, 4).map((decoration) => (
                <li key={decoration.id} className="dash-ops-item">
                  <div className="dash-ops-item__main">
                    <strong>{decoration.name}</strong>
                    <span className="dash-pill dash-pill--danger">Inactive</span>
                  </div>
                </li>
              ))}
              {decorations.filter((decoration) => decoration.active === false).length === 0 ? (
                <li className="dash-ops-item"><span className="dash-ops-item__meta">All decorations are active.</span></li>
              ) : null}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function SystemHealthPanel({ dashboard }) {
  const system = dashboard.system;
  const health = dashboard.health;
  const repositories = health?.repositories ? Object.entries(health.repositories) : [];
  const errorCount = repositories.filter(([, status]) => status.ok === false).length;

  const rows = [
    { label: 'API status', value: system ? 'healthy' : health ? 'unreachable' : 'offline', tone: system ? 'green' : 'red' },
    { label: 'Backend status', value: dashboard.healthStatus === 'ok' ? 'healthy' : dashboard.healthStatus, tone: dashboard.healthStatus === 'ok' ? 'green' : 'red' },
    { label: 'Environment', value: system?.env || 'N/A', tone: 'blue' },
    { label: 'Runtime', value: system?.node || 'N/A', tone: 'blue' },
    { label: 'Uptime', value: formatUptime(system?.uptimeSeconds), tone: 'blue' },
    { label: 'Started at', value: formatDateTime(system?.startedAt), tone: 'neutral' },
    { label: 'Response time', value: system ? `${system.responseTimeMs}ms` : 'N/A', tone: system?.responseTimeMs && system.responseTimeMs > 500 ? 'amber' : 'green' },
    { label: 'Error count', value: errorCount, tone: errorCount ? 'red' : 'green' },
    { label: 'Data directory', value: system?.dataDirectory || 'N/A', tone: 'neutral' },
    { label: 'Table prefix', value: system?.tablePrefix || 'N/A', tone: 'neutral' },
    { label: 'Deployment', value: 'Hostinger', tone: 'blue' },
  ];

  return (
    <section className="dash-card dash-card--span">
      <div className="dash-card__header">
        <div>
          <h2 className="dash-card__title">Engineering / System Health</h2>
          <p className="dash-card__subtitle">Runtime telemetry from the app server</p>
        </div>
      </div>

      <div className="dash-sys-grid">
        {rows.map((row) => (
          <div key={row.label} className="dash-sys-item">
            <span className="dash-sys-item__label">{row.label}</span>
            <span className="dash-sys-item__value"><StatusDot tone={row.tone} /> {row.value}</span>
          </div>
        ))}
      </div>

      {repositories.length > 0 ? (
        <>
          <h3 className="dash-subpanel__title dash-subpanel__title--spaced">Repository layer</h3>
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Status</th>
                  <th>Records</th>
                </tr>
              </thead>
              <tbody>
                {repositories.map(([name, status]) => (
                  <tr key={name}>
                    <td><strong>{name}</strong></td>
                    <td><span className={`dash-pill dash-pill--${status.ok ? 'success' : 'danger'}`}>{status.ok ? 'Healthy' : 'Error'}</span></td>
                    <td>{status.count ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}

function QuickActions() {
  const actions = [
    { label: 'Add Decoration', to: '/admin/decorations', hint: 'New package' },
    { label: 'Add Vendor', to: '/admin/vendors', hint: 'New partner' },
    { label: 'Add Service Area', to: '/admin/service-areas', hint: 'New pincode' },
    { label: 'View Orders', to: '/admin/orders', hint: 'All bookings' },
    { label: 'Manage Decorations', to: '/admin/decorations', hint: 'Catalog' },
    { label: 'Manage Vendors', to: '/admin/vendors', hint: 'Capacity' },
  ];

  return (
    <section className="dash-card">
      <div className="dash-card__header">
        <h2 className="dash-card__title">Quick Actions</h2>
      </div>
      <div className="dash-actions">
        {actions.map((action) => (
          <Link key={action.label} to={action.to} className="dash-action">
            <strong>{action.label}</strong>
            <span>{action.hint}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function DashboardHeader({ dashboard, isRefreshing, onRefresh, autoRefresh, onAutoRefreshToggle }) {
  const status = dashboard.healthStatus;
  const systemOnline = Boolean(dashboard.system);
  const statusTone = status === 'ok' ? 'green' : status === 'degraded' || status === 'unknown' ? 'amber' : 'red';
  const statusLabel = status === 'ok' ? 'Operational' : status === 'degraded' ? 'Degraded' : status === 'unknown' ? 'Unknown' : 'Down';

  return (
    <header className="dash-header">
      <div className="dash-header__top">
        <div className="dash-header__titles">
          <span className="eyebrow dash-header__eyebrow">Admin · Operations</span>
          <h1>DecorFesto Control Center</h1>
        </div>
        <div className="dash-header__controls">
          <label className="dash-toggle">
            <input type="checkbox" checked={autoRefresh} onChange={onAutoRefreshToggle} />
            <span className="dash-toggle__track"><span className="dash-toggle__thumb" /></span>
            <span>Auto-refresh</span>
          </label>
          <button type="button" className="dash-refresh" onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="dash-header__status">
        <div className={`dash-status dash-status--${statusTone}`}>
          <StatusDot tone={statusTone} />
          <div>
            <span className="dash-status__label">System status</span>
            <strong className="dash-status__value">{statusLabel}</strong>
          </div>
        </div>
        <div className="dash-status">
          <StatusDot tone={systemOnline ? 'green' : 'red'} />
          <div>
            <span className="dash-status__label">API status</span>
            <strong className="dash-status__value">{systemOnline ? 'Healthy' : 'Offline'}</strong>
          </div>
        </div>
        <div className="dash-status">
          <StatusDot tone={dashboard.healthStatus === 'ok' ? 'green' : 'red'} />
          <div>
            <span className="dash-status__label">Backend status</span>
            <strong className="dash-status__value">{dashboard.healthStatus === 'ok' ? 'Healthy' : dashboard.healthStatus}</strong>
          </div>
        </div>
        <div className="dash-status">
          <StatusDot tone="blue" />
          <div>
            <span className="dash-status__label">Environment</span>
            <strong className="dash-status__value">Production</strong>
          </div>
        </div>
        <div className="dash-status dash-status--meta">
          <div>
            <span className="dash-status__label">Last refresh</span>
            <strong className="dash-status__value">{formatDateTime(dashboard.fetchedAt)}</strong>
          </div>
        </div>
      </div>
    </header>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dash-skeleton" aria-label="Loading dashboard">
      <div className="dash-skeleton__line dash-skeleton__line--title" />
      <div className="dash-skeleton__line dash-skeleton__line--status" />
      <div className="dash-skeleton__grid">
        {Array.from({ length: 8 }).map((_, index) => <div key={index} className="dash-skeleton__card" />)}
      </div>
    </div>
  );
}

function DashboardError({ message, onRetry }) {
  return (
    <div className="dash-error">
      <strong>Dashboard unavailable</strong>
      <span>{message || 'Unable to load dashboard data.'}</span>
      <button type="button" className="dash-refresh" onClick={onRetry}>Retry</button>
    </div>
  );
}

function ChargesManagementCard() {
  const [charges, setCharges] = useState(() => getStoredCharges());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // New Charge form string state
  const [newName, setNewName] = useState('');
  const [newAmountStr, setNewAmountStr] = useState('100');
  const [newEnabled, setNewEnabled] = useState(true);

  // Edit Charge form string state
  const [editName, setEditName] = useState('');
  const [editAmountStr, setEditAmountStr] = useState('');
  const [editEnabled, setEditEnabled] = useState(true);

  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const refresh = useCallback(async () => {
    try {
      const data = await fetchAdminChargesApi();
      if (Array.isArray(data)) {
        setCharges(data);
      } else {
        setCharges(getStoredCharges());
      }
    } catch {
      setCharges(getStoredCharges());
    }
  }, []);

  useEffect(() => {
    refresh();
    const handleUpdated = () => refresh();
    if (typeof window !== 'undefined') {
      window.addEventListener('decorfesto-settings-updated', handleUpdated);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('decorfesto-settings-updated', handleUpdated);
      }
    };
  }, [refresh]);

  const handleStartEdit = (charge) => {
    setEditingId(charge.id);
    setEditName(charge.name);
    setEditAmountStr(String(charge.amount));
    setEditEnabled(charge.enabled);
    setErrorMsg('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!editName.trim()) {
      setErrorMsg('Please enter a valid charge name.');
      return;
    }

    const trimmedAmount = editAmountStr.trim();
    if (!trimmedAmount || isNaN(trimmedAmount)) {
      setErrorMsg('Please enter a valid amount.');
      return;
    }

    const parsed = parseInt(trimmedAmount, 10);
    if (isNaN(parsed) || parsed < 0) {
      setErrorMsg('Amount must be a non-negative number.');
      return;
    }

    await updateAdminChargeApi(editingId, {
      name: editName.trim(),
      amount: parsed,
      enabled: editEnabled,
    });

    setEditingId(null);
    await refresh();
    setMessage('✓ Charge updated successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleQuickToggle = async (id, currentEnabled) => {
    await updateAdminChargeApi(id, { enabled: !currentEnabled });
    await refresh();
    setMessage('✓ Status updated!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!newName.trim()) {
      setErrorMsg('Please enter a charge name.');
      return;
    }

    const trimmedAmount = newAmountStr.trim();
    if (!trimmedAmount || isNaN(trimmedAmount)) {
      setErrorMsg('Please enter a valid amount.');
      return;
    }

    const parsed = parseInt(trimmedAmount, 10);
    if (isNaN(parsed) || parsed < 0) {
      setErrorMsg('Amount must be a non-negative number.');
      return;
    }

    await createAdminChargeApi({
      name: newName.trim(),
      amount: parsed,
      description: 'Configured checkout charge.',
      enabled: newEnabled,
    });

    setNewName('');
    setNewAmountStr('100');
    setNewEnabled(true);
    setShowAddForm(false);
    await refresh();
    setMessage('✓ New charge added successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to permanently delete "${name}"? It will immediately stop appearing on customer checkouts.`)) {
      deleteCharge(id);
      refresh();
      setMessage(`✓ Charge "${name}" deleted.`);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <section className="dash-card" style={{ marginTop: '16px', marginBottom: '16px' }}>
      <div className="dash-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 className="dash-card__title">Charges & Fees</h2>
          <p className="dash-card__subtitle">Manage customer checkout fees, service charges, platform fees, and optional surcharges.</p>
        </div>
        <button
          type="button"
          className="button button--small button--ghost"
          onClick={() => {
            setShowAddForm((v) => !v);
            setErrorMsg('');
          }}
        >
          {showAddForm ? '✕ Close Form' : '+ Add Charge'}
        </button>
      </div>

      {message ? (
        <p style={{ color: '#16a34a', fontWeight: '700', fontSize: '0.88rem', margin: '8px 0' }}>{message}</p>
      ) : null}

      {errorMsg ? (
        <p style={{ color: '#dc2626', fontWeight: '700', fontSize: '0.88rem', margin: '8px 0' }}>✕ {errorMsg}</p>
      ) : null}

      {/* ADD CHARGE FORM */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', margin: '12px 0', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '1rem', margin: 0, color: '#0f172a' }}>Add New Charge</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', fontWeight: '600', flex: '1 1 200px' }}>
              <span>Charge Name *</span>
              <input
                type="text"
                placeholder="e.g. Platform Fee, Travel Charge"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', fontWeight: '600', width: '120px' }}>
              <span>Amount (₹) *</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={newAmountStr}
                onChange={(e) => setNewAmountStr(e.target.value.replace(/[^0-9]/g, ''))}
                required
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', fontWeight: '700', WebkitAppearance: 'none', MozAppearance: 'textfield' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', fontWeight: '600' }}>
              <span>Status</span>
              <button
                type="button"
                onClick={() => setNewEnabled((v) => !v)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  background: newEnabled ? '#16a34a' : '#cbd5e1',
                  color: '#ffffff',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                {newEnabled ? 'ON' : 'OFF'}
              </button>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button type="submit" className="button button--small">
              Save Charge
            </button>
            <button type="button" className="button button--small button--ghost" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* CHARGES LIST */}
      <div className="charges-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
        {charges.map((charge) => {
          const isEditing = editingId === charge.id;

          if (isEditing) {
            return (
              <form
                key={charge.id}
                onSubmit={handleSaveEdit}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid var(--accent, #e11d48)',
                  background: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>Edit Charge: {charge.name}</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', fontWeight: '600', flex: '1 1 200px' }}>
                    <span>Charge Name *</span>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', fontWeight: '600', width: '120px' }}>
                    <span>Amount (₹) *</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={editAmountStr}
                      onChange={(e) => setEditAmountStr(e.target.value.replace(/[^0-9]/g, ''))}
                      required
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', fontWeight: '700', WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', fontWeight: '600' }}>
                    <span>Status</span>
                    <button
                      type="button"
                      onClick={() => setEditEnabled((v) => !v)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: 'none',
                        background: editEnabled ? '#16a34a' : '#cbd5e1',
                        color: '#ffffff',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      {editEnabled ? 'ON' : 'OFF'}
                    </button>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button type="submit" className="button button--small">
                    Save Changes
                  </button>
                  <button type="button" className="button button--small button--ghost" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            );
          }

          return (
            <div
              key={charge.id}
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                background: charge.enabled ? '#ffffff' : '#f8fafc',
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                opacity: charge.enabled ? 1 : 0.75,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{charge.name}</strong>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: charge.enabled ? '#e6f4ea' : '#f1f5f9',
                      color: charge.enabled ? '#137333' : '#64748b',
                    }}
                  >
                    {charge.enabled ? '✓ Active' : '✕ Disabled'}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
                  {charge.description || 'Configured checkout charge.'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: '600', color: '#64748b' }}>Amount:</span>
                  <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>₹{charge.amount.toLocaleString('en-IN')}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => handleQuickToggle(charge.id, charge.enabled)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      border: 'none',
                      background: charge.enabled ? '#16a34a' : '#cbd5e1',
                      color: '#ffffff',
                      fontWeight: '700',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    {charge.enabled ? 'ON' : 'OFF'}
                  </button>

                  <button
                    type="button"
                    className="button button--small button--ghost"
                    onClick={() => handleStartEdit(charge)}
                    style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="text-link"
                    onClick={() => handleDelete(charge.id, charge.name)}
                    style={{ color: '#dc2626', fontSize: '0.85rem' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AdminDashboard() {
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const timerRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchAdminDashboard();
      setPayload(data);
      if (data?.backendError && !data?.backend) {
        setError(data.backendError);
      } else {
        setError('');
      }
    } catch (loadError) {
      setError(loadError.message || 'Unable to load dashboard data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setIsRefreshing(true);
      load();
    }, 30000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh, load]);

  const dashboard = useMemo(() => (payload ? deriveDashboard(payload) : null), [payload]);

  if (isLoading && !dashboard) {
    return <DashboardSkeleton />;
  }

  if (error && !dashboard) {
    return <DashboardError message={error} onRetry={load} />;
  }

  if (!dashboard) {
    return null;
  }

  const handleRefresh = () => {
    setIsRefreshing(true);
    load();
  };

  const recentOrders = dashboard.orders.raw.slice(0, 8);

  return (
    <main className="page dash-page">
      <section className="container dash-container">
        <DashboardHeader
          dashboard={dashboard}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          autoRefresh={autoRefresh}
          onAutoRefreshToggle={() => setAutoRefresh((current) => !current)}
        />

        <div className="dash-kpi-row">
          <KpiCard label="Total orders" value={dashboard.orders.total} to="/admin/orders" />
          <KpiCard label="Orders today" value={dashboard.orders.today} tone="blue" to="/admin/orders" />
          <KpiCard label="Pending" value={dashboard.orders.pending} tone="amber" to="/admin/orders" />
          <KpiCard label="Confirmed" value={dashboard.orders.confirmed} tone="blue" to="/admin/orders" />
          <KpiCard label="Completed" value={dashboard.orders.completed} tone="green" to="/admin/orders" />
          <KpiCard label="Cancelled" value={dashboard.orders.cancelled} tone="red" to="/admin/orders" />
          <KpiCard label="Total revenue" value={`₹${formatINR(dashboard.orders.revenue)}`} tone="green" to="/admin/orders" />
          <KpiCard label="Customers" value={dashboard.customers.total} tone="blue" />
          <KpiCard label="Vendors" value={`${dashboard.vendors.active}/${dashboard.vendors.total}`} tone="blue" to="/admin/vendors" />
          <KpiCard label="Service areas" value={dashboard.serviceAreas.serviceable} tone="green" to="/admin/service-areas" />
          <KpiCard label="Decorations" value={`${dashboard.decorations.active}/${dashboard.decorations.total}`} tone="blue" to="/admin/decorations" />
          <KpiCard label="Availability checks" value={dashboard.availability.totalChecks} tone="blue" />
        </div>

        <div className="dash-grid dash-grid--charts">
          <ChartCard title="Orders analysis" subtitle="7-day order volume">
            <OrdersBarChart series={dashboard.orders.overTime} />
          </ChartCard>
          <ChartCard title="Revenue analysis" subtitle="7-day revenue trend">
            <RevenueLineChart series={dashboard.orders.overTime} />
          </ChartCard>
        </div>

        <div className="dash-grid dash-grid--operations">
          <OrderOpsPanel title="Pending orders" orders={dashboard.orders.pendingOrders} emptyMessage="No pending orders." showAmount />
          <OrderOpsPanel title="Require attention" orders={dashboard.orders.unassigned} emptyMessage="Every order has a vendor." />
          <OrderOpsPanel title="Recently confirmed" orders={dashboard.orders.recentConfirmed} emptyMessage="No confirmed orders yet." showAmount />
          <OrderOpsPanel title="Upcoming bookings" orders={dashboard.orders.upcoming} emptyMessage="No upcoming bookings." showAmount />
          <OrderOpsPanel title="Cancelled" orders={dashboard.orders.cancelledOrders} emptyMessage="No cancellations." showAmount />
          <div className="dash-card">
            <div className="dash-card__header">
              <h2 className="dash-card__title">Status distribution</h2>
            </div>
            <StatusDistribution distribution={dashboard.orders.statusDistribution} statusLabels={dashboard.statusLabels} />
          </div>
        </div>

        <ServiceAreaPanel dashboard={dashboard} />
        <VendorPanel dashboard={dashboard} />
        <DecorationPanel dashboard={dashboard} />
        <ChargesManagementCard />
        <SystemHealthPanel dashboard={dashboard} />

        <div className="dash-grid dash-grid--footer">
          <QuickActions />
          <section className="dash-card">
            <div className="dash-card__header">
              <h2 className="dash-card__title">Recent orders</h2>
            </div>
            {recentOrders.length === 0 ? <EmptyState title="No orders" /> : (
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Decor</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <Link to={`/admin/orders/${order.id}`} className="dash-ops-item__id">{order.id}</Link>
                          <small>{formatDateTime(order.createdAt)}</small>
                        </td>
                        <td>{order.customerName}</td>
                        <td>{order.decoration}</td>
                        <td>₹{formatINR(order.amount)}</td>
                        <td><span className="dash-pill">{order.status}</span></td>
                        <td><Link to={`/admin/orders/${order.id}`} className="dash-action-link">View</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

export default AdminDashboard;
