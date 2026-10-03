export const CallControls = ({
  onStart,
  onEnd,
  isCallActive,
  language,
  onLanguageChange,
  onToolAction,
}) => {
  return (
    <div className="call-controls-wrap">
      <div className="call-controls">
        <label className="language-control" htmlFor="call-language">
          Call language
          <select
            id="call-language"
            value={language}
            onChange={(event) => onLanguageChange(event.target.value)}
            disabled={isCallActive}
          >
            <option value="english">English</option>
            <option value="hinglish">Hinglish (Hindi + English)</option>
          </select>
        </label>
        <button className="start-button" onClick={onStart} disabled={isCallActive}>
          Start Call
        </button>
        <button className="end-button" onClick={onEnd} disabled={!isCallActive}>
          End Call
        </button>
      </div>

      <div className="tool-row">
        <button type="button" className="tool-button" onClick={() => onToolAction("lookup_order")}>
          Order Status
        </button>
        <button type="button" className="tool-button" onClick={() => onToolAction("shipping_policy")}>
          Shipping
        </button>
        <button type="button" className="tool-button" onClick={() => onToolAction("returns_policy")}>
          Returns
        </button>
      </div>
    </div>
  );
};

export default CallControls;
