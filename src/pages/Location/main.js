import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';

const Location = () => {
    const [mapUrl, setMapUrl] = useState("https://maps.re4billion.ai");

    useEffect(() => {
        if (!Cookies.get('token') || Cookies.get('role') !== "Admin") {
            window.location.href = "/";
        }

        // Append a timestamp to the URL to force reload
        const timestamp = new Date().getTime();
        setMapUrl(`https://main.d17v8r0l0o8h5x.amplifyapp.com/?cacheBust=${timestamp}`);
    }, []);

    return (
        <div className='flex flex-col w-full max-h-screen'>
            <div className='fixed w-full'>
                {/* Add header or controls here if needed */}
            </div>
            <div className='w-full h-screen'>
                {/* Map with cache-busting param */}
                <iframe 
                    src={mapUrl}
                    title="RE4BILLION Map" 
                    className='h-screen w-full'
                ></iframe>
            </div>
        </div>
    );
};

export default Location;
