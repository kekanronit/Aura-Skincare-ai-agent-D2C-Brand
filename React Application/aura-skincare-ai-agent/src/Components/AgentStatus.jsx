// import React from 'react'

export const AgentStatus = ({ status }) => {
  return (
    <div className="agent-status">
      <span className="status-dot"></span>

      <div>
        <span className="status-label">Agent Status</span>
        <strong>{status}</strong>
      </div>
    </div>
  );
};

export default AgentStatus;
