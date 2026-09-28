function Transcript({ messages, summary }) {
  return (
    <section className="card transcript-card">
      <div className="section-heading">
        <h2>Call Transcript</h2>
      </div>

      {messages.length === 0 ? (
        <div className="empty-state">
          <p>No conversation yet.</p>
          <span>Start a call to begin.</span>
        </div>
      ) : (
        <div className="transcript">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`message ${message.role}`}>
              <span className="message-role">
                {message.role === "customer" ? "You" : "Aria"}
              </span>
              <p>{message.text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="summary-box">
        <h3>Structured Call Outcome</h3>
        <pre>{JSON.stringify(summary, null, 2)}</pre>
      </div>
    </section>
  );
}

export default Transcript;
