import BusinessHoursForm from "@/components/admin/BusinessHoursForm";

const Settings = () => {
  return (
    <div className="space-y-6">
      <BusinessHoursForm />
      {/* Other settings cards can be added here in the future */}
    </div>
  );
};

export default Settings;