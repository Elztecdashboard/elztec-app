interface Props {
  titel: string;
  subtitel?: string;
  children?: React.ReactNode;
}

export default function PaginaHeader({ titel, subtitel, children }: Props) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{titel}</h1>
        {subtitel && <p className="text-gray-500 mt-1">{subtitel}</p>}
      </div>
      {children}
    </div>
  );
}
