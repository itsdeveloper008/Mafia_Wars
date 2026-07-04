import { collection, doc } from 'firebase/firestore'
import { getDb } from '@/services/firebase/client'

export function roomDoc(roomId: string) {
  return doc(getDb(), 'rooms', roomId)
}

export function playersCol(roomId: string) {
  return collection(getDb(), 'rooms', roomId, 'players')
}

export function playerDoc(roomId: string, playerId: string) {
  return doc(getDb(), 'rooms', roomId, 'players', playerId)
}

export function secretsCol(roomId: string) {
  return collection(getDb(), 'rooms', roomId, 'secrets')
}

export function secretDoc(roomId: string, playerId: string) {
  return doc(getDb(), 'rooms', roomId, 'secrets', playerId)
}

export function stateDoc(roomId: string) {
  return doc(getDb(), 'rooms', roomId, 'state', 'current')
}

export function votesCol(roomId: string) {
  return collection(getDb(), 'rooms', roomId, 'votes')
}

export function voteDoc(roomId: string, playerId: string) {
  return doc(getDb(), 'rooms', roomId, 'votes', playerId)
}

export function nightActionsCol(roomId: string) {
  return collection(getDb(), 'rooms', roomId, 'nightActions')
}

export function nightActionDoc(roomId: string, playerId: string) {
  return doc(getDb(), 'rooms', roomId, 'nightActions', playerId)
}

export function logsCol(roomId: string) {
  return collection(getDb(), 'rooms', roomId, 'logs')
}

export function hostLogsCol(roomId: string) {
  return collection(getDb(), 'rooms', roomId, 'hostLogs')
}

export function matchHistoryCol() {
  return collection(getDb(), 'matchHistory')
}

export function statsDoc(uid: string) {
  return doc(getDb(), 'statistics', uid)
}

export function codeIndexDoc(code: string) {
  return doc(getDb(), 'roomCodes', code.toUpperCase())
}
