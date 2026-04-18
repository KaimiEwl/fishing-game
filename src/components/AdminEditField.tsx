import { Input } from '@/components/ui/input';

interface AdminEditFieldProps {
  label: string;
  value: number;
  onChange: (nextValue: string) => void;
}

const AdminEditField = ({ label, value, onChange }: AdminEditFieldProps) => (
  <div>
    <label className="text-xs text-muted-foreground">{label}</label>
    <Input type="number" value={value} onChange={(event) => onChange(event.target.value)} />
  </div>
);

export default AdminEditField;
