import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";

import prisma from "../lib/prisma";
import { requireAdmin, requireMember } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { loginLimiter, registerLimiter } from "../middleware/rateLimiter";

const router = Router();


function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return secret;
}


// Remove password safely
function removePassword(member: any) {

  const {
    password,
    ...safe
  } = member;

  return safe;
}


// Validation

const RegisterSchema = z.object({

  fullName:z.string().min(2),
  fatherName:z.string().min(2),
  cnic:z.string(),
  dob:z.string(),
  gender:z.string(),

  bloodGroup:z.string().optional(),

  email:z.string().email(),

  phone:z.string(),

  whatsapp:z.string().optional(),

  whatsappPublic:z.boolean().optional(),

  address:z.string(),

  city:z.string(),

  district:z.string().optional(),

  province:z.string(),

  occupation:z.string(),

  education:z.string(),

  membershipType:z.string(),

  password:z.string().min(8),

  familyInfoPublic:z.boolean().optional(),

  photoUrl:z.string().optional(),

  cnicFrontUrl:z.string().optional(),

  cnicBackUrl:z.string().optional(),

  paymentProofUrl:z.string().optional(),

  additionalPhotos:z.array(z.string()).optional(),

  familyInfo:z.any().optional()

});


const LoginSchema=z.object({

 email:z.string().email(),

 password:z.string()

});



// LOGIN

router.post(
"/login",
loginLimiter,
validate(LoginSchema),
async(
req:Request,
res:Response,
next:NextFunction
)=>{


try{


const {
email,
password
}=req.body;



const member = await prisma.member.findFirst({

where:{
email
}

});


if(!member){

return res.status(401).json({
error:"Invalid credentials"
});

}



const match = await bcrypt.compare(
password,
member.password
);



if(!match){

return res.status(401).json({
error:"Invalid credentials"
});

}



const token = jwt.sign(

{
id:member.id,
role:"member"
},

getJwtSecret(),

{
expiresIn:"7d"
}

);



res.json({

token,

member:removePassword(member)

});



}catch(error){

next(error);

}

});





// REGISTER


router.post(
"/register",
registerLimiter,
validate(RegisterSchema),
async(
req:Request,
res:Response,
next:NextFunction
)=>{


try{


const {

familyInfo,

password,

additionalPhotos,

...memberData

}=req.body;



const existing =
await prisma.member.findFirst({

where:{
OR:[
{
email:memberData.email
},
{
cnic:memberData.cnic
}
]
}

});



if(existing){

return res.status(409).json({

error:"Member already exists"

});

}



const hashedPassword =
await bcrypt.hash(password,12);



const year =
new Date().getFullYear();



const count =
await prisma.member.count();



const memberNo =
`ARA-${year}-${String(count+1).padStart(5,"0")}`;



const newMember =
await prisma.member.create({

data:{

...memberData,

memberNo,

password:hashedPassword,

additionalPhotos:
additionalPhotos
?
JSON.stringify(additionalPhotos)
:
null,


...(familyInfo
?
{
familyInfo:{
create:familyInfo
}
}
:
{})


}

});



res.status(201).json(

removePassword(newMember)

);



}catch(error){

next(error);

}


});






// GET MEMBERS


router.get(
"/",
async(
req:Request,
res:Response,
next:NextFunction
)=>{


try{


const members =
await prisma.member.findMany({

orderBy:{
createdAt:"desc"
}

});



res.json(

members.map(removePassword)

);



}catch(error){

next(error);

}

});






// UPDATE STATUS


router.patch(
"/:id/status",
requireAdmin,
async(
req:Request,
res:Response
)=>{


try{


const id =
String(req.params.id);



const {
status,
adminNote,
rejectionReason

}=req.body;



const updated =
await prisma.member.update({

where:{
id
},

data:{

status,

adminNote,

rejectionReason,

approvedAt:
status==="approved"
?
new Date()
:
null

}

});



res.json(
removePassword(updated)
);



}catch(error){


res.status(500).json({

error:"Failed to update member"

});


}

});






// UPDATE PROFILE


router.patch(
"/:id",
requireMember,
async(
req:Request,
res:Response
)=>{


try{


const id =
String(req.params.id);



const updated =
await prisma.member.update({

where:{
id
},

data:req.body

});



res.json(
removePassword(updated)
);



}catch(error){


res.status(500).json({

error:"Failed to update member"

});


}

});






// CHANGE PASSWORD


router.post(
"/:id/change-password",
requireMember,
async(
req:Request,
res:Response
)=>{


try{


const id =
String(req.params.id);


const {
currentPassword,
newPassword

}=req.body;



const member =
await prisma.member.findUnique({

where:{
id
}

});



if(!member){

return res.status(404).json({

error:"Member not found"

});

}



const match =
await bcrypt.compare(
currentPassword,
member.password
);



if(!match){

return res.status(401).json({

error:"Wrong password"

});

}



const hashed =
await bcrypt.hash(
newPassword,
12
);



await prisma.member.update({

where:{
id
},

data:{
password:hashed
}

});



res.json({
success:true
});



}catch(error){

res.status(500).json({

error:"Password update failed"

});

}

});







// DELETE


router.delete(
"/:id",
requireAdmin,
async(
req:Request,
res:Response
)=>{


try{


await prisma.member.delete({

where:{
id:String(req.params.id)
}

});



res.json({
success:true
});



}catch(error){


res.status(500).json({

error:"Delete failed"

});

}


});





// CURRENT MEMBER


router.get(
"/me",
async(
req:Request,
res:Response
)=>{


try{


const token =
req.headers.authorization
?.split(" ")[1];



if(!token){

return res.status(401).json({

error:"No token"

});

}



const decoded:any =
jwt.verify(
token,
getJwtSecret()
);



const member =
await prisma.member.findUnique({

where:{
id:decoded.id
}

});



if(!member){

return res.status(404).json({

error:"Member not found"

});

}



res.json(
removePassword(member)
);



}catch(error){

res.status(401).json({

error:"Invalid token"

});

}

});




export default router;
