export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function normalizePagination(
  query: PaginationQuery,
  defaultLimit = 20,
  maxLimit = 50,
): { page: number; limit: number; skip: number } {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(maxLimit, Math.max(1, query.limit ?? defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export function toPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 0,
  };
}
