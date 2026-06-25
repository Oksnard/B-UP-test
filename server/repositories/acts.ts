import { prisma } from '../utils/prisma'

export interface ActUpdate {
  isSent?: boolean
  isSigned?: boolean
  managerComment?: string | null
}

/** Update act flags; stamp sentAt/signedAt when transitioning to true, clear when set false. */
export async function updateAct(id: string, patch: ActUpdate, now = new Date()) {
  const current = await prisma.act.findUnique({ where: { id } })
  if (!current) return null
  return prisma.act.update({
    where: { id },
    data: {
      isSent: patch.isSent ?? current.isSent,
      isSigned: patch.isSigned ?? current.isSigned,
      sentAt: patch.isSent === true && !current.isSent ? now : patch.isSent === false ? null : current.sentAt,
      signedAt: patch.isSigned === true && !current.isSigned ? now : patch.isSigned === false ? null : current.signedAt,
      managerComment: patch.managerComment === undefined ? current.managerComment : patch.managerComment,
    },
  })
}
