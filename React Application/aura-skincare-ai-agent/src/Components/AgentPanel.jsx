import AgentStatus from "./AgentStatus";
import CallControls from "./CallControls";

function AgentPanel({
  status,
  onStart,
  onEnd,
  isCallActive,
  language,
  onLanguageChange,
  onToolAction,
}) {
  return (
    <section className="agent-panel">
      <div className="agent-avatar">🤖</div>
      <h2>Aria</h2>
      <p className="agent-role">Aura Skincare Support Agent</p>
      <AgentStatus status={status} />
      <CallControls
        onStart={onStart}
        onEnd={onEnd}
        isCallActive={isCallActive}
        language={language}
        onLanguageChange={onLanguageChange}
        onToolAction={onToolAction}
      />
    </section>
  );
}

export default AgentPanel;
