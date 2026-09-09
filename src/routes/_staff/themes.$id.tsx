import { createFileRoute } from '@tanstack/react-router'
import { EditThemePage } from '@/features/themes/CreateThemePage'
export const Route = createFileRoute('/_staff/themes/$id')({
  component: function ThemeEditRoute() {
    const { id } = Route.useParams()
    return <EditThemePage id={id} />
  },
})
