import {useState} from "react";
import {registerMember} from "../../services/memberService";

export default function MemberRegistration(){
 const [name,setName]=useState("");

 async function submit(){
  await registerMember({name});
 }

 return <div>
  <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name"/>
  <button onClick={submit}>Register</button>
 </div>
}