import nodemailer from "nodemailer";

export const MASTER_EMAIL =
  process.env.MASTER_EMAIL ||
  "anjumanearaianfaisalabad@gmail.com";

export const INFO_EMAIL =
  process.env.INFO_EMAIL ||
  "info@anjumanearaian.org";


function transporter(){

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;


  if(!host || !user || !pass){
    console.error("SMTP missing");
    return null;
  }


  return nodemailer.createTransport({

    host,
    port,

    secure:false,

    auth:{
      user,
      pass
    }

  });

}



export async function sendEmail(
  to:string,
  subject:string,
  html:string
){

 const mailer = transporter();


 if(!mailer){

   return {
    sent:false,
    reason:"SMTP missing"
   };

 }


 await mailer.sendMail({

   from:
   `Anjuman-e-Araian Faisalabad <${process.env.EMAIL_FROM || MASTER_EMAIL}>`,

   to,

   replyTo:INFO_EMAIL,

   subject,

   html

 });


 return {
   sent:true
 };

}



export function emailFrame(
title:string,
body:string
){

return `

<div style="font-family:Arial;max-width:620px;margin:auto">

<h2 style="background:#1a4d2e;color:white;padding:20px">
${title}
</h2>

<div style="padding:20px">

${body}

<br>

Anjuman-e-Araian Faisalabad

</div>

</div>

`;

}
