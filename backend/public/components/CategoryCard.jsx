// ============================================
// CATEGORY CARD COMPONENT
// Card component for category sections
// ============================================

window.CategoryCard = ({ icon: Icon, title, onClick }) => (
    <div className="category-card" onClick={onClick}>
        <span className="category-icon"><Icon /></span>
        <span className="category-title">{title}</span>
    </div>
);
