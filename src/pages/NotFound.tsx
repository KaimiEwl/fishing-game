import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import NotFoundState from '@/components/NotFoundState';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return <NotFoundState />;
};

export default NotFound;
