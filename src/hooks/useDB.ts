import { useDBContext } from '../contexts/DBContext'

export function useDB() {
  return useDBContext()
}
