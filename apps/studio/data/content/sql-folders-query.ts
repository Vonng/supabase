import { useInfiniteQuery, UseInfiniteQueryOptions } from '@tanstack/react-query'

import { components } from 'api-types'
import { get, handleError } from 'data/fetchers'
import { ResponseError } from 'types'
import { contentKeys } from './keys'

export type SnippetFolderResponse = components['schemas']['GetUserContentFolderResponse']['data']
export type SnippetFolder = components['schemas']['UserContentFolder']
export type Snippet = components['schemas']['UserContentObjectMeta']

export async function getSQLSnippetFolders(
  { projectRef, folderId, cursor }: { projectRef?: string; folderId?: string; cursor?: string },
  signal?: AbortSignal
) {
  if (typeof projectRef === 'undefined') throw new Error('projectRef is required')

  if (folderId) {
    const { data, error } = await get('/platform/projects/{ref}/content/folders/{id}', {
      params: { path: { ref: projectRef, id: folderId }, query: { cursor } },
      signal,
    })

    if (error) throw handleError(error)
    return data.data
  } else {
    const { data, error } = await get('/platform/projects/{ref}/content/folders', {
      params: { path: { ref: projectRef }, query: { type: 'sql' } },
      signal,
    })

    if (error) throw handleError(error)
    return data.data
  }
}

export type SQLSnippetFoldersData = Awaited<ReturnType<typeof getSQLSnippetFolders>>
export type SQLSnippetFoldersError = ResponseError

const LIMIT = 50

export const useSQLSnippetFoldersQuery = <TData = SQLSnippetFoldersData>(
  { projectRef, folderId }: { projectRef?: string; folderId?: string },
  {
    enabled = true,
    ...options
  }: UseInfiniteQueryOptions<SQLSnippetFoldersData, SQLSnippetFoldersError, TData> = {}
) =>
  useInfiniteQuery<SQLSnippetFoldersData, SQLSnippetFoldersError, TData>(
    contentKeys.folders(projectRef, folderId),
    ({ signal, pageParam }) =>
      getSQLSnippetFolders({ projectRef, folderId, cursor: pageParam }, signal),
    {
      enabled: enabled && typeof projectRef !== 'undefined',
      getNextPageParam(lastPage, pages) {
        const page = pages.length

        if ((lastPage.contents?.length ?? 0) < LIMIT) {
          return undefined
        }

        return String(page)
      },
      ...options,
    }
  )
