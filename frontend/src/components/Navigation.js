import { Link } from 'react-router-dom';

const Navigation = () => {
  return (
    <nav style={{
      backgroundColor: '#2c3e50',
      padding: '10px 20px',
      marginBottom: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap'
    }}>
      <ul style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap'
      }}>
        <li>
          <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>
            🏠 Dashboard
          </Link>
        </li>
        <li>
          <Link to="/inventory" style={{ color: 'white', textDecoration: 'none' }}>
            📦 Inventory
          </Link>
        </li>
        <li>
          <Link to="/network" style={{ color: 'white', textDecoration: 'none' }}>
            🏪 Nearby Pharmacies
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navigation;