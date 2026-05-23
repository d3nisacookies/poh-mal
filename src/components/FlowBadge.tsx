import { FLOW_LABELS, type FlowType } from '../db/schema'

const FLOW_STYLES: Record<FlowType, string> = {
  flow1: 'bg-blue-100 text-blue-700',
  flow2: 'bg-violet-100 text-violet-700',
  flow3: 'bg-teal-100 text-teal-700',
}

export default function FlowBadge({ flow }: { flow: FlowType }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${FLOW_STYLES[flow]}`}>
      {FLOW_LABELS[flow]}
    </span>
  )
}
