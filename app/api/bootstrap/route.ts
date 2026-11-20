import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const [patients, tasks, referrals, carePlans, communications, transactions, activity, users] = await Promise.all([
    prisma.patient.findMany({ orderBy: { updatedAt: 'desc' } }),
    prisma.task.findMany({ include: { patient: true, assignee: true }, orderBy: { updatedAt: 'desc' } }),
    prisma.referral.findMany({ include: { patient: true }, orderBy: { updatedAt: 'desc' } }),
    prisma.carePlan.findMany({ include: { patient: true }, orderBy: { updatedAt: 'desc' } }),
    prisma.communication.findMany({ include: { patient: true }, orderBy: { createdAt: 'desc' } }),
    prisma.financialTransaction.findMany({ include: { patient: true }, orderBy: { createdAt: 'desc' } }),
    prisma.auditEvent.findMany({ include: { actor: true }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: 'asc' } })
  ]);
  return NextResponse.json({ patients, tasks, referrals, carePlans, communications, transactions, activity, users });
}
