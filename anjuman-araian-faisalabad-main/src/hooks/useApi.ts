import {useEffect,useState} from "react";

export function useApi<T>(loader:()=>Promise<T>){
 const [data,setData]=useState<T|null>(null);
 const [loading,setLoading]=useState(true);

 useEffect(()=>{
  loader().then(setData).finally(()=>setLoading(false));
 },[]);

 return {data,loading};
}