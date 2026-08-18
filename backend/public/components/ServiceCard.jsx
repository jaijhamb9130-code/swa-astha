// ============================================
// SERVICE CARD COMPONENT
// Interactive service card for home screen
// ============================================

window.ServiceCard = ({ icon: Icon, title, highlight, onClick }) => (
    <div className={`service-card ${highlight ? 'highlight' : ''}`} onClick={onClick}>
        <span className="service-card-add">+</span>
        <span className="service-icon"><Icon /></span>
        <span className="service-card-title">{title}</span>
    </div>
);
