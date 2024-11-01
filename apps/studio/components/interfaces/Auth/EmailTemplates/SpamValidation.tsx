import { Check } from 'lucide-react'

import Table from 'components/to-be-cleaned/Table'
import InformationBox from 'components/ui/InformationBox'
import { ValidateSpamResponse } from 'data/auth/validate-spam-mutation'
import { cn, WarningIcon } from 'ui'
import { Markdown } from 'components/interfaces/Markdown'

interface SpamValidationProps {
  validationResult?: ValidateSpamResponse
}

// [Joshen] According to API, we label as a spam risk as long as there are spam
// rules identified with scores above 0. Scores are irrelevant in our context and
// are hence not visualized in the UI

export const SpamValidation = ({ validationResult }: SpamValidationProps) => {
  const spamRules = (validationResult?.rules ?? []).filter((rule) => rule.score > 0)
  const hasSpamWarning = spamRules.length > 0

  return (
    <InformationBox
      className={cn('mb-2', hasSpamWarning && '!bg-alternative')}
      icon={hasSpamWarning ? <WarningIcon /> : <Check size={16} className="text-brand" />}
      title={
        hasSpamWarning
          ? 'Email has a high probability of being marked as spam and deliverability may be affected'
          : 'Email content is unlikely to be marked as spam'
      }
      description={
        hasSpamWarning ? (
          <>
            {spamRules.length > 0 && (
              <div className="flex flex-col gap-y-3">
                <p>
                  {hasSpamWarning
                    ? ` Rectify the following issues to improve your email's deliverability in order of priority:`
                    : ` Address the following issues to improve your email's deliverability:`}
                </p>
                <Table
                  head={[
                    <Table.th key="name">Warning</Table.th>,
                    <Table.th key="desc">Description</Table.th>,
                  ]}
                  body={spamRules.map((rule) => (
                    <Table.tr key={rule.name}>
                      <Table.td>{rule.name}</Table.td>
                      <Table.td>{rule.desc}</Table.td>
                    </Table.tr>
                  ))}
                />
                <Markdown
                  className="!max-w-none"
                  content="Spam validation is powered by [SpamAssassin](https://spamassassin.apache.org/doc.html). Full list of all available warnings can be found [here](https://gist.github.com/ychaouche/a2faff159c2a1fea16019156972c7f8b)."
                />
              </div>
            )}
          </>
        ) : null
      }
    />
  )
}
