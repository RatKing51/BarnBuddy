import React, { useMemo } from 'react'
import { toast } from 'react-toastify'

function formatDateTime(value) {
  if (!value) return 'Not recorded'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not recorded'

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function formatDate(value) {
  if (!value) return 'Not recorded'

  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`)
  if (Number.isNaN(date.getTime())) return 'Not recorded'

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatBytes(value) {
  const bytes = Number(value) || 0
  if (!bytes) return 'No file'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function humanize(value) {
  if (value === null || value === undefined || value === '') return 'Not set'
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function activityDescription(item) {
  const action = item?.action || 'Used BarnBuddy'
  return action.charAt(0).toUpperCase() + action.slice(1)
}

function initials(name, email) {
  const source = name || email || 'User'
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function inputClass(extra = '') {
  return `w-full rounded-md border border-slate-700/80 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-300 ${extra}`
}

function StatusBadge({ children, tone = 'slate' }) {
  const tones = {
    emerald: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100',
    amber: 'border-amber-300/25 bg-amber-400/10 text-amber-100',
    red: 'border-red-300/25 bg-red-500/10 text-red-100',
    sky: 'border-sky-300/25 bg-sky-400/10 text-sky-100',
    slate: 'border-slate-700 bg-slate-950 text-slate-300',
  }

  return (
    <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  )
}

function Detail({ label, value, mono = false }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-500">{label}</dt>
      <dd className={`mt-1 break-words text-sm text-slate-200 ${mono ? 'font-mono text-xs' : ''}`}>{value || 'Not set'}</dd>
    </div>
  )
}

function Section({ title, description, action, children, className = '' }) {
  return (
    <section className={`rounded-lg border border-slate-800 bg-slate-900 ${className}`}>
      <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="font-semibold text-white">{title}</h4>
          {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function Empty({ title, text }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/35 p-7 text-center">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p>
    </div>
  )
}

async function copyValue(label, value) {
  if (!value) return

  try {
    await navigator.clipboard.writeText(value)
    toast.success(`${label} copied.`)
  } catch {
    toast.error(`Could not copy ${label.toLowerCase()}.`)
  }
}

export default function AdminSupportDesk({
  users,
  usersLoading,
  userSearch,
  onUserSearchChange,
  onSearchUsers,
  onFindUser,
  selectedUser,
  onSelectUser,
  onRefreshUsers,
  details,
  detailsLoading,
  detailsError,
  onRefreshDetails,
  onOpenAccountControls,
  onOpenFullActivity,
  supportMessages,
  onUpdateSupportStatus,
  adminFlagOptions,
  flagsDraft,
  onToggleFlag,
  noteDraft,
  onNoteChange,
  onSaveFlags,
  savingFlags,
}) {
  const localUser = details?.localUser || selectedUser?.localUser || null
  const counts = details?.counts || {}
  const unresolvedMessages = useMemo(
    () => supportMessages.filter((message) => message.status !== 'closed'),
    [supportMessages]
  )
  const priorityUsers = users.filter((user) => user.adminFlags?.includes('support_priority')).length
  const primaryEmail = selectedUser?.emailAddresses?.find((address) => address.primary)
    || selectedUser?.emailAddresses?.[0]
  const supportHistory = details?.supportHistory || []
  const warnings = []

  if (selectedUser?.banned) warnings.push('This Clerk account is banned.')
  if (selectedUser?.locked) warnings.push('This Clerk account is locked.')
  if (selectedUser && !localUser) warnings.push('The Clerk account is not linked to a local BarnBuddy user.')
  if (localUser?.onboarding_required && !localUser?.onboarding_completed) warnings.push('Onboarding is still required.')
  if (primaryEmail && !primaryEmail.verified) warnings.push('The primary email address is not verified.')

  const dataCounts = [
    ['Herds', counts.herds],
    ['Animals', counts.animals],
    ['Active', counts.activeAnimals],
    ['Archived', counts.archivedAnimals],
    ['Deceased', counts.deceasedAnimals],
    ['Weight records', counts.weightRecords],
    ['Health events', counts.healthEvents],
    ['Vet visits', counts.vetVisits],
    ['Vaccinations', counts.vaccinations],
    ['Finance', counts.financeRecords],
    ['Feed', counts.feedRecords],
    ['Inventory', counts.inventoryRecords],
    ['Reproductions', counts.reproductions],
    ['Births', counts.births],
    ['FFA projects', counts.ffaProjects],
    ['FFA animals', counts.ffaAnimals],
    ['FFA activities', counts.ffaActivities],
    ['FFA finances', counts.ffaFinances],
    ['Import requests', counts.importRequests],
    ['Activity events', counts.activityEvents],
    ['Support messages', counts.supportMessages],
  ]

  return (
    <div className="mt-6 space-y-5">
      <section className="overflow-hidden rounded-lg border border-sky-300/20 bg-gradient-to-br from-sky-500/15 via-slate-900 to-slate-900">
        <div className="grid grid-cols-2 gap-px bg-slate-800 sm:grid-cols-4">
          {[
            ['Needs reply', unresolvedMessages.length],
            ['New messages', supportMessages.filter((message) => message.status === 'new').length],
            ['Customers loaded', users.length],
            ['Priority accounts', priorityUsers],
          ].map(([label, value]) => (
            <div key={label} className="bg-slate-900/95 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[21rem_minmax(0,1fr)]">
        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 px-5 py-4">
              <h3 className="text-lg font-semibold text-white">Find a customer</h3>
              <p className="mt-1 text-sm text-slate-400">Search name, email, or Clerk ID.</p>
            </div>
            <form onSubmit={onSearchUsers} className="border-b border-slate-800 p-4">
              <div className="flex gap-2">
                <input
                  aria-label="Search customers"
                  className={inputClass()}
                  value={userSearch}
                  onChange={(event) => onUserSearchChange(event.target.value)}
                  placeholder="Search customers"
                />
                <button
                  type="submit"
                  disabled={usersLoading}
                  className="rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
                >
                  {usersLoading ? '...' : 'Find'}
                </button>
              </div>
            </form>
            <div className="max-h-[31rem] space-y-2 overflow-y-auto p-4">
              {users.map((user) => (
                <button
                  key={user.clerkUserId}
                  type="button"
                  onClick={() => onSelectUser(user.clerkUserId)}
                  className={`w-full rounded-md border p-3 text-left transition ${
                    user.clerkUserId === selectedUser?.clerkUserId
                      ? 'border-sky-300/50 bg-sky-500/15'
                      : 'border-slate-800 bg-slate-950/45 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {user.imageUrl ? (
                      <img className="h-9 w-9 rounded-full object-cover" src={user.imageUrl} alt="" />
                    ) : (
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-800 text-xs font-semibold text-slate-300">
                        {initials(user.name, user.email)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{user.name || 'Unknown user'}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{user.email || user.clerkUserId}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <StatusBadge tone={user.isPremium ? 'emerald' : 'slate'}>{user.isPremium ? 'Premium' : 'Free'}</StatusBadge>
                        {user.adminFlags?.includes('support_priority') && <StatusBadge tone="sky">Priority</StatusBadge>}
                        {(user.banned || user.locked) && <StatusBadge tone="red">Restricted</StatusBadge>}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              {!users.length && <Empty title={usersLoading ? 'Searching' : 'No customers found'} text="Try another email, name, or Clerk user ID." />}
            </div>
            <div className="border-t border-slate-800 p-4">
              <button type="button" onClick={onRefreshUsers} className="w-full rounded-md border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800">
                {usersLoading ? 'Refreshing...' : 'Refresh customer list'}
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 px-5 py-4">
              <h3 className="text-lg font-semibold text-white">Support queue</h3>
              <p className="mt-1 text-sm text-slate-400">Open the customer behind a message.</p>
            </div>
            <div className="max-h-[28rem] space-y-2 overflow-y-auto p-4">
              {unresolvedMessages.slice(0, 12).map((message) => (
                <button
                  key={message.id}
                  type="button"
                  onClick={() => onFindUser(message.email)}
                  className="w-full rounded-md border border-slate-800 bg-slate-950/45 p-3 text-left hover:bg-slate-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-white">{message.name || message.email}</p>
                    <StatusBadge tone={message.status === 'new' ? 'sky' : 'amber'}>{humanize(message.status)}</StatusBadge>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-400">{message.topic}</p>
                  <p className="mt-2 text-xs text-slate-500">{formatDateTime(message.created_at)}</p>
                </button>
              ))}
              {!unresolvedMessages.length && <Empty title="Queue clear" text="There are no unresolved contact messages." />}
            </div>
          </section>
        </aside>

        <div className="min-w-0 space-y-5">
          {!selectedUser ? (
            <Empty title="Choose a customer" text="Search or select a customer to open their complete support profile." />
          ) : (
            <>
              <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    {selectedUser.imageUrl ? (
                      <img className="h-16 w-16 rounded-full object-cover ring-2 ring-slate-800" src={selectedUser.imageUrl} alt="" />
                    ) : (
                      <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-sky-500/15 text-lg font-semibold text-sky-100 ring-2 ring-sky-300/20">
                        {initials(selectedUser.name, selectedUser.email)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-300">Customer profile</p>
                      <h3 className="mt-1 truncate text-2xl font-semibold text-white">{selectedUser.name || 'Unknown user'}</h3>
                      <p className="mt-1 break-all text-sm text-slate-400">{selectedUser.email || 'No email on file'}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <StatusBadge tone={selectedUser.isPremium ? 'emerald' : 'slate'}>{selectedUser.isPremium ? 'Premium active' : 'Free plan'}</StatusBadge>
                        <StatusBadge tone={localUser ? 'sky' : 'amber'}>{localUser ? 'Local account linked' : 'Not locally linked'}</StatusBadge>
                        {selectedUser.adminFlags?.map((flag) => <StatusBadge key={flag}>{humanize(flag)}</StatusBadge>)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => copyValue('Email', selectedUser.email)} className="rounded-md border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">Copy email</button>
                    {selectedUser.email && <a href={`mailto:${selectedUser.email}`} className="rounded-md border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">Email customer</a>}
                    <button type="button" onClick={onRefreshDetails} className="rounded-md border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">{detailsLoading ? 'Refreshing...' : 'Refresh'}</button>
                    <button type="button" onClick={onOpenAccountControls} className="rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-600">Account controls</button>
                  </div>
                </div>
              </section>

              {warnings.length > 0 && (
                <section className="rounded-lg border border-amber-300/25 bg-amber-400/10 p-4">
                  <p className="text-sm font-semibold text-amber-100">Account attention</p>
                  <ul className="mt-2 space-y-1 text-sm text-amber-50/80">
                    {warnings.map((warning) => <li key={warning}>• {warning}</li>)}
                  </ul>
                </section>
              )}

              {detailsLoading && !details ? (
                <Empty title="Loading customer profile" text="Collecting account, activity, and farm records." />
              ) : detailsError ? (
                <div className="rounded-lg border border-red-300/20 bg-red-500/10 p-5 text-sm text-red-100">{detailsError}</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                      ['Last sign-in', formatDateTime(selectedUser.lastSignInAt)],
                      ['Last active', formatDateTime(selectedUser.lastActiveAt)],
                      ['Joined', formatDateTime(selectedUser.createdAt)],
                      ['Recorded actions', counts.activityEvents || 0],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-500">{label}</p>
                        <p className="mt-2 text-sm font-semibold text-slate-100">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
                    <Section title="Account context" description="What the customer told BarnBuddy during setup.">
                      <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <Detail label="Onboarding" value={localUser?.onboarding_completed ? 'Completed' : localUser?.onboarding_required ? 'Required' : 'Not required'} />
                        <Detail label="First animal" value={localUser?.created_first_animal ? 'Created' : 'Not created'} />
                        <Detail label="User type" value={humanize(localUser?.user_type)} />
                        <Detail label="Herd size" value={humanize(localUser?.herd_size_range)} />
                        <Detail label="Primary species" value={localUser?.primary_species?.length ? localUser.primary_species.map(humanize).join(', ') : 'Not set'} />
                        <Detail label="Main goal" value={humanize(localUser?.main_goal)} />
                        <Detail label="Setup mode" value={humanize(localUser?.setup_mode)} />
                        <Detail label="Primary animal label" value={humanize(localUser?.animal_primary_identifier)} />
                      </dl>
                    </Section>

                    <Section title="Preferences and communications" description="Current display, reminder, and email choices.">
                      <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <Detail label="Theme" value={humanize(localUser?.app_theme)} />
                        <Detail label="Dashboard density" value={humanize(localUser?.dashboard_density)} />
                        <Detail label="Care window" value={localUser?.care_window_days ? `${localUser.care_window_days} days` : 'Not set'} />
                        <Detail label="Email updates" value={localUser?.email_updates ? 'Enabled' : 'Disabled'} />
                        <Detail label="Automatic reminders" value={localUser?.automatic_reminders ? 'Enabled' : 'Disabled'} />
                        <Detail label="Newsletter" value={details?.newsletter ? `${humanize(details.newsletter.status)} via ${humanize(details.newsletter.source)}` : 'No subscription record'} />
                      </dl>
                    </Section>
                  </div>

                  <Section title="Data footprint" description="Counts across every BarnBuddy record type available to this account.">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                      {dataCounts.map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-950/45 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">{label}</p>
                          <p className="mt-2 text-xl font-semibold text-white">{Number(value) || 0}</p>
                        </div>
                      ))}
                    </div>
                  </Section>

                  <Section
                    title="Recent customer activity"
                    description="Successful changes recorded by BarnBuddy, newest first."
                    action={localUser?.id ? <button type="button" onClick={() => onOpenFullActivity(localUser.id)} className="rounded-md border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">Open full activity</button> : null}
                  >
                    <div className="divide-y divide-slate-800">
                      {(details?.recentActivity || []).map((item) => (
                        <article key={item.id} className="grid grid-cols-1 gap-3 py-3 first:pt-0 last:pb-0 lg:grid-cols-[1fr_auto]">
                          <div className="min-w-0">
                            <p className="font-semibold text-white">{activityDescription(item)}</p>
                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                              <span>{item.details?.method || 'Action'}</span>
                              {item.details?.status && <span>Status {item.details.status}</span>}
                              {item.details?.path && <span className="break-all font-mono">{item.details.path}</span>}
                            </div>
                          </div>
                          <time className="text-sm text-slate-500">{formatDateTime(item.createdAt)}</time>
                        </article>
                      ))}
                      {!details?.recentActivity?.length && <Empty title="No recorded activity" text="Successful customer record changes will appear here." />}
                    </div>
                  </Section>

                  <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
                    <Section title="Herds" description={`${counts.herds || 0} total herds on the account.`}>
                      <div className="space-y-2">
                        {(details?.herds || []).map((herd) => (
                          <div key={herd.id} className="rounded-md border border-slate-800 bg-slate-950/45 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-white">{herd.name || `Herd ${herd.id}`}</p>
                                <p className="mt-1 text-xs text-slate-500">{herd.location || 'No location set'}</p>
                              </div>
                              <StatusBadge>{herd.animal_count || 0} animals</StatusBadge>
                            </div>
                          </div>
                        ))}
                        {!details?.herds?.length && <Empty title="No herds" text="This customer has not created a herd." />}
                      </div>
                    </Section>

                    <Section title="Recent animals" description="The latest 24 animal records on the account.">
                      <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                        {(details?.animals || []).map((animal) => (
                          <div key={animal.id} className="rounded-md border border-slate-800 bg-slate-950/45 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-white">{animal.name || `Animal ${animal.id}`}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {[humanize(animal.species), humanize(animal.sex), animal.tag_id ? `Tag ${animal.tag_id}` : ''].filter((value) => value && value !== 'Not set').join(' • ') || 'No details'}
                                </p>
                                {animal.birthdate && <p className="mt-1 text-xs text-slate-500">Born {formatDate(animal.birthdate)}</p>}
                              </div>
                              <StatusBadge tone={animal.status === 'active' ? 'emerald' : 'slate'}>{humanize(animal.status || 'active')}</StatusBadge>
                            </div>
                          </div>
                        ))}
                        {!details?.animals?.length && <Empty title="No animals" text="This customer has not created an animal." />}
                      </div>
                    </Section>
                  </div>

                  <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
                    <Section title="Support history" description="Contact submissions matching this customer's email.">
                      <div className="space-y-3">
                        {supportHistory.map((message) => (
                          <article key={message.id} className="rounded-md border border-slate-800 bg-slate-950/45 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="font-semibold text-white">{message.topic}</p>
                                <p className="mt-1 text-xs text-slate-500">{formatDateTime(message.created_at)}</p>
                              </div>
                              <select className={inputClass('w-fit py-1.5')} value={message.status} onChange={(event) => onUpdateSupportStatus(message.id, event.target.value)}>
                                <option value="new">New</option>
                                <option value="open">Open</option>
                                <option value="closed">Closed</option>
                              </select>
                            </div>
                            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{message.message}</p>
                          </article>
                        ))}
                        {!supportHistory.length && <Empty title="No matching messages" text="No contact form message matches this customer's email." />}
                      </div>
                    </Section>

                    <Section title="Import assistant requests" description="Recent transfers and their processing state.">
                      <div className="space-y-2">
                        {(details?.importRequests || []).map((request) => (
                          <div key={request.id} className="rounded-md border border-slate-800 bg-slate-950/45 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-white">{request.file_name || humanize(request.record_format)}</p>
                                <p className="mt-1 text-xs text-slate-500">{formatBytes(request.file_size)} • {formatDateTime(request.created_at)}</p>
                              </div>
                              <StatusBadge tone={request.status === 'complete' ? 'emerald' : request.status === 'new' ? 'sky' : 'amber'}>{humanize(request.status)}</StatusBadge>
                            </div>
                            <p className="mt-2 text-xs text-slate-400">AI extraction: {humanize(request.ai_extraction_status)}</p>
                          </div>
                        ))}
                        {!details?.importRequests?.length && <Empty title="No import requests" text="This customer has not used the import assistant." />}
                      </div>
                    </Section>
                  </div>

                  <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
                    <Section title="Authentication and identifiers" description="Useful account references and sign-in health.">
                      <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <Detail label="Clerk user ID" value={selectedUser.clerkUserId} mono />
                        <Detail label="Local user ID" value={localUser?.id ? String(localUser.id) : 'Not linked'} mono />
                        <Detail label="Username" value={selectedUser.username} />
                        <Detail label="Primary email" value={primaryEmail ? `${primaryEmail.email} (${primaryEmail.verified ? 'verified' : 'not verified'})` : selectedUser.email} />
                        <Detail label="Password sign-in" value={selectedUser.passwordEnabled ? 'Enabled' : 'Not enabled'} />
                        <Detail label="Two-factor authentication" value={selectedUser.twoFactorEnabled ? 'Enabled' : 'Not enabled'} />
                        <Detail label="Account restriction" value={selectedUser.banned ? 'Banned' : selectedUser.locked ? 'Locked' : 'None'} />
                        <Detail label="Connected accounts" value={selectedUser.connectedAccounts?.length ? selectedUser.connectedAccounts.map((account) => humanize(account.provider)).join(', ') : 'None'} />
                        <Detail label="Phone numbers" value={selectedUser.phoneNumbers?.length ? selectedUser.phoneNumbers.map((phone) => `${phone.phoneNumber}${phone.verified ? ' (verified)' : ''}`).join(', ') : 'None'} />
                        <Detail label="Additional emails" value={selectedUser.emailAddresses?.filter((address) => !address.primary).map((address) => address.email).join(', ') || 'None'} />
                      </dl>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <button type="button" onClick={() => copyValue('Clerk user ID', selectedUser.clerkUserId)} className="rounded-md border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">Copy Clerk ID</button>
                        {localUser?.id && <button type="button" onClick={() => copyValue('Local user ID', String(localUser.id))} className="rounded-md border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">Copy local ID</button>}
                      </div>
                    </Section>

                    <Section
                      title="Internal support record"
                      description="Private flags and notes visible only to admins."
                      action={<button type="button" onClick={onSaveFlags} disabled={savingFlags} className="rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50">{savingFlags ? 'Saving...' : 'Save support record'}</button>}
                    >
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {adminFlagOptions.map(([value, label]) => (
                          <label key={value} className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm font-semibold ${flagsDraft.includes(value) ? 'border-sky-300/40 bg-sky-500/15 text-sky-100' : 'border-slate-800 bg-slate-950/45 text-slate-300'}`}>
                            <input type="checkbox" checked={flagsDraft.includes(value)} onChange={() => onToggleFlag(value)} />
                            {label}
                          </label>
                        ))}
                      </div>
                      <label className="mt-4 block">
                        <span className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-500">Private support note</span>
                        <textarea className={inputClass('mt-2 min-h-32 resize-y')} value={noteDraft} onChange={(event) => onNoteChange(event.target.value)} placeholder="Troubleshooting context, promises made, or follow-up notes." />
                      </label>
                    </Section>
                  </div>

                  <Section title="Subscription snapshot" description="Access state from Clerk and the BarnBuddy database.">
                    <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                      <Detail label="Clerk plan" value={humanize(selectedUser.plan)} />
                      <Detail label="Clerk status" value={humanize(selectedUser.subscriptionStatus)} />
                      <Detail label="Local plan" value={humanize(localUser?.subscription_plan || 'free')} />
                      <Detail label="Local status" value={humanize(localUser?.subscription_status || 'free')} />
                      <Detail label="Premium source" value={humanize(localUser?.subscription_source)} />
                      <Detail label="Premium expiration" value={selectedUser.premiumExpiresAt ? formatDateTime(selectedUser.premiumExpiresAt) : 'Lifetime / not set'} />
                      <Detail label="Premium records retained" value={String(counts.premiumRecords || 0)} />
                      <Detail label="Newsletter updated" value={details?.newsletter ? formatDateTime(details.newsletter.updated_at) : 'No record'} />
                    </dl>
                    <button type="button" onClick={onOpenAccountControls} className="mt-5 rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600">Manage subscription and data</button>
                  </Section>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
