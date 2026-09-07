import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { env } from '../../config.js';
import { asyncHandler } from '../../lib/async.js';
const router=Router();
router.post('/login',asyncHandler(async(req,res)=>{
  const p=z.object({email:z.string().email(),password:z.string().min(6)}).parse(req.body);
  const user=await prisma.user.findUnique({where:{email:p.email.toLowerCase()}});
  if(!user||!user.isActive||!(await bcrypt.compare(p.password,user.passwordHash))) return void res.status(401).json({message:'Invalid credentials'});
  const payload={sub:user.id,email:user.email,name:user.name,role:user.role};
  const accessToken=jwt.sign(payload,env.JWT_ACCESS_SECRET,{expiresIn:env.JWT_ACCESS_EXPIRES as jwt.SignOptions['expiresIn']});
  const refreshToken=jwt.sign(payload,env.JWT_REFRESH_SECRET,{expiresIn:`${env.JWT_REFRESH_EXPIRES_DAYS}d` as jwt.SignOptions['expiresIn']});
  res.json({accessToken,refreshToken,user:{id:user.id,email:user.email,name:user.name,role:user.role}});
}));
export default router;
