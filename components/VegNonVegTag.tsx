"use client";

import { useEffect, useState } from "react";

interface VegNonVegTagProps {
    type:string

}
export default function VegNonVegTag({type}:VegNonVegTagProps) {
    const [isVeg, setIsVeg] = useState(false);
    useEffect(() => {
        if(type === "veg"){
            setIsVeg(true);
        } else {
            setIsVeg(false);
        }
    }, [type])
    return (
         <div className="absolute top-2 z-20 right-0 w-10 h-10 flex items-center justify-center">
                   
                    {  isVeg? (
                        <span className="block">
                          <span style={{ display: 'inline-block', border: '2px solid #16A34A', borderRadius: 4, background: '#fff', width: 15, height: 15,  display: 'flex',
                              flexDirection: 'row',
                              justifyContent: 'center',
                              alignItems: 'center', }}>
                            <span style={{
                             
                              background: '#16A34A',
                              borderRadius: '50%',
                              width: 8,
                              height: 8,
                              
                              
                            }} />
                          </span>
                        </span>
                      ) : (
                        <span className="block">
                          <span style={{ display: 'inline-block', border: '2px solid #DC2626', borderRadius: 4, background: '#fff', width: 15, height: 15, display: 'flex',
                              flexDirection: 'row',
                              justifyContent: 'center',
                              alignItems: 'center' }}>
                            <span style={{
                              
                              background: '#DC2626',
                              borderRadius: '50%',
                              width: 8,
                              height: 8,
                             
                            }} />
                          </span>
                        </span>
                      )
}
                    
                  </div>
    );
}