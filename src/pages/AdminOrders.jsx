import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOrdersApi } from '../services/orderService';

function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState('All');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      setLoading(true);
      const res = await getOrdersApi();
      setOrders(res || []);
      setLoading(false);
    }
    loadOrders();
  }, []);

  const statuses = ['All', ...new Set(orders.map((order) => order.bookingStatus || 'Order Received'))];
  const visibleOrders = statusFilter === 'All'
    ? orders
    : orders.filter((order) => (order.bookingStatus || 'Order Received') === statusFilter);

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">Admin</span>
          <h1>Orders</h1>
          <p>Local mock booking requests placed through DecorFesto.</p>
        </div>

        <div className="admin-orders__toolbar">
          <label className="search-field admin-orders__filter">
            <span>Booking status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
        </div>

        {visibleOrders.length === 0 ? (
          <div className="card-panel empty-state">
            <h2>No orders found</h2>
            <p>Orders placed with the local mock checkout will appear here.</p>
          </div>
        ) : (
          <div className="card-panel admin-orders__table-wrap">
            <table className="admin-orders__table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Decoration</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Payment Status</th>
                  <th>Booking Status</th>
                  <th>Vendor</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>
                      <strong>{order.customerName}</strong>
                      {order.customerEmail ? <small>{order.customerEmail}</small> : null}
                    </td>
                    <td>{order.decorationName || order.items?.[0]?.productName || 'DecorFesto package'}</td>
                    <td>{order.date || order.items?.[0]?.date || 'Pending'}</td>
                    <td>₹{Number(order.total || 0).toLocaleString('en-IN')}</td>
                    <td>{order.paymentStatus || 'Pending'}</td>
                    <td><span className="status-pill">{order.bookingStatus || 'Order Received'}</span></td>
                    <td>{order.vendorName || order.vendorId || 'Unassigned'}</td>
                    <td>
                      <Link to={`/admin/orders/${order.id}`} className="button button--small button--ghost">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default AdminOrders;
