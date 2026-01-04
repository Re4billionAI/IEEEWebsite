import { useState, useEffect } from 'react';
import Home from './home';

import { useSelector, useDispatch } from 'react-redux';
import BrieData from '../../components/BriefData/main';
import { toggleSpecificPage } from "../../store/slices/LocationSlice";
import Cookies from 'js-cookie';

const Main = () => {
  const dispatch = useDispatch();

  // Initialize state from cookie
  const [page, setPage] = useState(() => Cookies.get('specificPage') || '');

  // Handle page toggle and update cookie + state
  const handlePageChange = (newPage) => {
    Cookies.set('specificPage', newPage); // update cookie
    dispatch(toggleSpecificPage(newPage)); // optional: sync Redux
    setPage(newPage); // trigger re-render
  };

  // Watch for cookie changes (in case changed outside manually)
  useEffect(() => {
    const interval = setInterval(() => {
      const current = Cookies.get('specificPage');
      if (current !== page) {
        setPage(current);
      }
    }, 1000); // poll every 1s

    return () => clearInterval(interval);
  }, [page]);

  return (
    <>
      {page === "specificPage"
        ? <Home handlePageChange={handlePageChange} />
        : <BrieData handlePageChange={handlePageChange} />
      }
    </>
  );
};

export default Main;
