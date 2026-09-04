import express, { Request, Response } from "express";
import prisma from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";

const router = express.Router();


// GET /api/messages
// Fetch messages (Admin)
router.get("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = Number(String(req.query.page || "1")) || 1;
    const limit = Number(String(req.query.limit || "20")) || 20;

    const skip = (page - 1) * limit;

    const filter = String(req.query.filter || "");
    const startDateQuery = String(req.query.startDate || "");
    const endDateQuery = String(req.query.endDate || "");

    const whereClause: any = {};

    const now = new Date();

    if (filter === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      whereClause.createdAt = {
        gte: start,
      };

    } else if (filter === "yesterday") {

      const startToday = new Date();
      startToday.setHours(0,0,0,0);

      const startYesterday = new Date(startToday);
      startYesterday.setDate(startYesterday.getDate() - 1);

      whereClause.createdAt = {
        gte: startYesterday,
        lt: startToday,
      };

    } else if (filter === "week") {

      const start = new Date();
      start.setDate(start.getDate() - 7);
      start.setHours(0,0,0,0);

      whereClause.createdAt = {
        gte: start,
      };

    } else if (startDateQuery && endDateQuery) {

      const start = new Date(startDateQuery);
      start.setHours(0,0,0,0);

      const end = new Date(endDateQuery);
      end.setHours(23,59,59,999);

      whereClause.createdAt = {
        gte: start,
        lte: end,
      };

    } else if (startDateQuery) {

      const start = new Date(startDateQuery);
      start.setHours(0,0,0,0);

      whereClause.createdAt = {
        gte: start,
      };

    } else if (endDateQuery) {

      const end = new Date(endDateQuery);
      end.setHours(23,59,59,999);

      whereClause.createdAt = {
        lte: end,
      };
    }


    const [messages, total] = await Promise.all([

      prisma.message.findMany({
        where: whereClause,
        orderBy:{
          createdAt:"desc"
        },
        skip,
        take:limit,
      }),

      prisma.message.count({
        where:whereClause
      })

    ]);


    res.json({
      messages,
      pagination:{
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });


  } catch(error){

    console.error(
      "Failed to fetch messages:",
      error
    );

    res.status(500).json({
      error:"Failed to fetch messages"
    });

  }
});




// POST /api/messages
// Public message submission
router.post("/", async (req: Request, res: Response)=>{

  try {

    const {
      type,
      name,
      email,
      phone = "",
      message
    }: {
      type:string;
      name:string;
      email:string;
      phone?:string;
      message:string;
    } = req.body;


    if(!type || !name || !email || !message){

      return res.status(400).json({
        error:"Missing required fields"
      });

    }


    const newMessage = await prisma.message.create({

      data:{
        type,
        name,
        email,
        phone,
        message,
        status:"unread"
      }

    });


    res.status(201).json(newMessage);


  }catch(error){

    console.error(
      "Failed to submit message:",
      error
    );


    res.status(500).json({
      error:"Failed to submit message"
    });

  }

});




// PATCH /api/messages/:id/status

router.patch(
"/:id/status",
requireAdmin,
async(req:Request,res:Response)=>{

try{

const id = String(req.params.id);

const status = String(req.body.status || "");


if(!status){

return res.status(400).json({
error:"Status is required"
});

}


const updated = await prisma.message.update({

where:{
id
},

data:{
status
}

});


res.json(updated);


}catch(error){

console.error(
"Failed to update status:",
error
);


res.status(500).json({
error:"Failed to update message status"
});

}

});





// DELETE /api/messages/:id

router.delete(
"/:id",
requireAdmin,
async(req:Request,res:Response)=>{

try{

const id = String(req.params.id);


await prisma.message.delete({

where:{
id
}

});


res.json({
success:true
});


}catch(error){

console.error(
"Failed to delete message:",
error
);


res.status(500).json({
error:"Failed to delete message"
});

}

});



export default router;
