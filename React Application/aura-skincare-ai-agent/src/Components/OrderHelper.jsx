function OrderHelper({ orders }) {
  return (
    <section className="card">
      <div className="section-heading">
        <h2>Test Orders</h2>
        <span>{orders.length} orders</span>
      </div>

      <div className="orders-list">
        {orders.map((order) => (
          <div className="order-card" key={order.id}>
            <div className="order-header">
              <strong>{order.id}</strong>
              <span>{order.status}</span>
            </div>

            <p><strong>Customer:</strong> {order.customer}</p>
            <p><strong>Product:</strong> {order.product}</p>
            <p><strong>Value:</strong> {order.value}</p>
            <p><strong>Courier:</strong> {order.courier || "N/A"}</p>
            <p><strong>Tracking:</strong> {order.tracking || "N/A"}</p>
            <p><strong>Details:</strong> {order.expected || order.delivered || order.ordered || "Order placed"}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default OrderHelper;
