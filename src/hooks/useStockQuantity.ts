import { useCallback } from 'react'
import type { Product, StockMovement } from '../types'
import { quantityOf } from '../utils/stock'

export function useStockQuantity(movements:StockMovement[]){return useCallback((product:Product)=>quantityOf(product,movements),[movements])}
