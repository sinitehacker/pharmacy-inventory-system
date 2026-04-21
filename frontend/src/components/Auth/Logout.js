const Logout = ({ onLogout }) => {
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('pharmacy_id');
    localStorage.removeItem('pharmacy_name');
    onLogout();
  };

  return (
    <button
      onClick={handleLogout}
      style={{
        padding: '8px 16px',
        backgroundColor: '#ef4444',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
      }}
    >
      🚪 Logout
    </button>
  );
};

export default Logout;