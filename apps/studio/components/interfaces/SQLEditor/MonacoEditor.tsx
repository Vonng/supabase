import Editor, { Monaco, OnMount } from '@monaco-editor/react'
import { debounce } from 'lodash'
import { useRouter } from 'next/router'
import { MutableRefObject, useEffect, useRef } from 'react'

import { useParams } from 'common'
import { useLocalStorageQuery } from 'hooks/misc/useLocalStorage'
import { useSelectedProject } from 'hooks/misc/useSelectedProject'
import { LOCAL_STORAGE_KEYS } from 'lib/constants'
import { useProfile } from 'lib/profile'
import { useSqlEditorV2StateSnapshot } from 'state/sql-editor-v2'
import { cn } from 'ui'
import { untitledSnippetTitle } from './SQLEditor.constants'
import type { IStandaloneCodeEditor } from './SQLEditor.types'
import { createSqlSnippetSkeletonV2 } from './SQLEditor.utils'
import { useIsAssistantV2Enabled } from '../App/FeaturePreview/FeaturePreviewContext'
import { useAppStateSnapshot } from 'state/app-state'

export type MonacoEditorProps = {
  id: string
  className?: string
  editorRef: MutableRefObject<IStandaloneCodeEditor | null>
  monacoRef: MutableRefObject<Monaco | null>
  autoFocus?: boolean
  executeQuery: () => void
  onHasSelection: (value: boolean) => void
}

const MonacoEditor = ({
  id,
  editorRef,
  monacoRef,
  autoFocus = true,
  className,
  executeQuery,
  onHasSelection,
}: MonacoEditorProps) => {
  const router = useRouter()
  const { profile } = useProfile()
  const { ref, content } = useParams()
  const project = useSelectedProject()
  const snapV2 = useSqlEditorV2StateSnapshot()

  const isAssistantV2Enabled = useIsAssistantV2Enabled()
  const { setAiAssistantPanel } = useAppStateSnapshot()

  const [intellisenseEnabled] = useLocalStorageQuery(
    LOCAL_STORAGE_KEYS.SQL_EDITOR_INTELLISENSE,
    true
  )

  const snippet = snapV2.snippets[id]

  const executeQueryRef = useRef(executeQuery)
  executeQueryRef.current = executeQuery

  const handleEditorOnMount: OnMount = async (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    const model = editorRef.current.getModel()
    if (model !== null) {
      monacoRef.current.editor.setModelMarkers(model, 'owner', [])
    }

    editor.addAction({
      id: 'run-query',
      label: 'Run Query',
      keybindings: [monaco.KeyMod.CtrlCmd + monaco.KeyCode.Enter],
      contextMenuGroupId: 'operation',
      contextMenuOrder: 0,
      run: () => {
        executeQueryRef.current()
      },
    })

    if (isAssistantV2Enabled) {
      editor.addAction({
        id: 'explain-code',
        label: 'Explain Code',
        contextMenuGroupId: 'operation',
        contextMenuOrder: 1,
        run: () => {
          const selectedValue = (editorRef?.current as any)
            .getModel()
            .getValueInRange((editorRef?.current as any)?.getSelection())
          setAiAssistantPanel({
            open: true,
            sqlSnippets: [selectedValue],
            initialInput: 'Can you explain this section to me in more detail?',
          })
        },
      })
    }

    editor.onDidChangeCursorSelection(({ selection }) => {
      const noSelection =
        selection.startLineNumber === selection.endLineNumber &&
        selection.startColumn === selection.endColumn
      onHasSelection(!noSelection)
    })

    // add margin above first line
    editorRef.current.changeViewZones((accessor) => {
      accessor.addZone({
        afterLineNumber: 0,
        heightInPx: 4,
        domNode: document.createElement('div'),
      })
    })

    if (autoFocus) {
      if (editor.getValue().length === 1) editor.setPosition({ lineNumber: 1, column: 2 })
      editor.focus()
    }
  }

  // [Joshen] Also needs updating here
  const debouncedSetSql = debounce((id, value) => {
    snapV2.setSql(id, value)
  }, 1000)

  function handleEditorChange(value: string | undefined) {
    const snippetCheck = snapV2.snippets[id]

    if (id && value) {
      if (snippetCheck) {
        debouncedSetSql(id, value)
      } else {
        if (ref && profile !== undefined && project !== undefined) {
          const snippet = createSqlSnippetSkeletonV2({
            id,
            name: untitledSnippetTitle,
            sql: value,
            owner_id: profile?.id,
            project_id: project?.id,
          })
          snapV2.addSnippet({ projectRef: ref, snippet })
          snapV2.addNeedsSaving(snippet.id)
          router.push(`/project/${ref}/sql/${snippet.id}`, undefined, { shallow: true })
        }
      }
    }
  }

  // if an SQL query is passed by the content parameter, set the editor value to its content. This
  // is usually used for sending the user to SQL editor from other pages with SQL.
  useEffect(() => {
    if (content && content.length > 0) {
      handleEditorChange(content)
    }
  }, [])

  return (
    <Editor
      className={cn(className, 'monaco-editor')}
      theme={'supabase'}
      onMount={handleEditorOnMount}
      onChange={handleEditorChange}
      defaultLanguage="pgsql"
      defaultValue={snippet?.snippet.content.sql}
      path={id}
      options={{
        tabSize: 2,
        fontSize: 13,
        minimap: { enabled: false },
        wordWrap: 'on',
        // [Joshen] Commenting the following out as it causes the autocomplete suggestion popover
        // to be positioned wrongly somehow. I'm not sure if this affects anything though, but leaving
        // comment just in case anyone might be wondering. Relevant issues:
        // - https://github.com/microsoft/monaco-editor/issues/2229
        // - https://github.com/microsoft/monaco-editor/issues/2503
        // fixedOverflowWidgets: true,
        suggest: {
          showMethods: intellisenseEnabled,
          showFunctions: intellisenseEnabled,
          showConstructors: intellisenseEnabled,
          showDeprecated: intellisenseEnabled,
          showFields: intellisenseEnabled,
          showVariables: intellisenseEnabled,
          showClasses: intellisenseEnabled,
          showStructs: intellisenseEnabled,
          showInterfaces: intellisenseEnabled,
          showModules: intellisenseEnabled,
          showProperties: intellisenseEnabled,
          showEvents: intellisenseEnabled,
          showOperators: intellisenseEnabled,
          showUnits: intellisenseEnabled,
          showValues: intellisenseEnabled,
          showConstants: intellisenseEnabled,
          showEnums: intellisenseEnabled,
          showEnumMembers: intellisenseEnabled,
          showKeywords: intellisenseEnabled,
          showWords: intellisenseEnabled,
          showColors: intellisenseEnabled,
          showFiles: intellisenseEnabled,
          showReferences: intellisenseEnabled,
          showFolders: intellisenseEnabled,
          showTypeParameters: intellisenseEnabled,
          showIssues: intellisenseEnabled,
          showUsers: intellisenseEnabled,
          showSnippets: intellisenseEnabled,
        },
      }}
    />
  )
}

export default MonacoEditor
