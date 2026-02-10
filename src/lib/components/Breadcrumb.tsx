import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center gap-2 text-sm flex-wrap">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-center gap-2">
            {idx > 0 && <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />}
            {item.href ? (
              <Link
                to={item.href}
                className="text-bdo-blue hover:text-blue-700 hover:underline transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-600 font-medium" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export default Breadcrumb
