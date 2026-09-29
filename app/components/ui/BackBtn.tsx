import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';

interface BackBtnProps {
  href?: string;
  label?: string;
}

export default function BackBtn({ href = "/", label = "Back to Home" }: BackBtnProps) {
  return (
    <Link 
      href={href} 
      className="absolute top-8 left-6 md:left-12 flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors z-50"
    >
      <FiArrowLeft size={16} />
      <span>{label}</span>
    </Link>
  );
}