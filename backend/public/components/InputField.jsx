// ============================================
// INPUT FIELD COMPONENT WITH VALIDATION
// Reusable form input with icon and actions
// ============================================

window.InputField = ({ icon: Icon, type = "text", placeholder, value, onChange, action, onAction, maxLength, isSelect, options, error }) => {
    const Icons = window.Icons;

    if (isSelect) {
        return (
            <div className="input-wrapper">
                <div className={`input-group ${error ? 'error' : ''}`}>
                    <span className="input-icon"><Icon /></span>
                    <select value={value} onChange={onChange} required>
                        <option value="" disabled>{placeholder}</option>
                        {options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                    <Icons.ChevronDown />
                </div>
                {error && <span className="error-message">{error}</span>}
            </div>
        );
    }

    return (
        <div className="input-wrapper">
            <div className={`input-group ${error ? 'error' : ''}`}>
                <span className="input-icon"><Icon /></span>
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    maxLength={maxLength}
                    spellCheck="false"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                />
                {action && (
                    <span className="input-action" onClick={onAction}>{action}</span>
                )}
            </div>
            {error && <span className="error-message">{error}</span>}
        </div>
    );
};
