import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import { startOfMonth, endOfMonth, addMonths, format } from "date-fns";
import { Package } from "./admin/Packages";

const PackagesPage = () => {
  const { user } = useAuth();
  const [availablePackages, setAvailablePackages] = useState<Package[]>([]);
  const [userPackage, setUserPackage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchPageData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const today = new Date();
      const currentMonthStart = startOfMonth(today);
      const currentMonthEnd = endOfMonth(today);

      const [
        { data: packagesData, error: packagesError },
        { data: userPackageData, error: userPackageError }
      ] = await Promise.all([
        supabase
          .from("packages")
          .select("*, package_items(*)")
          .eq("is_active", true),
        supabase
          .from("user_packages")
          .select("*, packages(*, package_items(*))")
          .eq("user_id", user.id)
          .gte("valid_from", format(currentMonthStart, 'yyyy-MM-dd'))
          .lte("valid_until", format(currentMonthEnd, 'yyyy-MM-dd'))
          .single()
      ]);

      if (packagesError) throw packagesError;
      if (userPackageError && userPackageError.code !== 'PGRST116') { // Ignore 'single row not found'
        throw userPackageError;
      }

      setAvailablePackages(packagesData || []);
      setUserPackage(userPackageData);

    } catch (error: any) {
      showError("Could not load package data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, [user]);

  const handleAcquirePackage = async (packageId: string) => {
    if (!user) return;

    const nextMonth = addMonths(new Date(), 1);
    const valid_from = format(startOfMonth(nextMonth), 'yyyy-MM-dd');
    const valid_until = format(endOfMonth(nextMonth), 'yyyy-MM-dd');

    const { error } = await supabase
      .from("user_packages")
      .insert({
        user_id: user.id,
        package_id: packageId,
        valid_from,
        valid_until,
      });

    if (error) {
      if (error.code === '23505') { // unique constraint violation
        showError("You already have a package for next month.");
      } else {
        showError("Could not acquire package.");
      }
    } else {
      showSuccess("Package acquired for next month!");
      fetchPageData();
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-8">
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>My Current Package</CardTitle>
            </CardHeader>
            <CardContent>
              {userPackage ? (
                <div>
                  <h3 className="text-lg font-semibold">{userPackage.packages.name}</h3>
                  <p className="text-sm text-gray-600">{userPackage.packages.description}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Valid from {format(new Date(userPackage.valid_from), 'PPP')} to {format(new Date(userPackage.valid_until), 'PPP')}
                  </p>
                  {/* Credit consumption will be visible in the booking process */}
                </div>
              ) : (
                <p>You do not have an active package for this month.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available Packages</CardTitle>
              <CardDescription>Acquire a package for next month.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availablePackages.map(pkg => (
                <Card key={pkg.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle>{pkg.name}</CardTitle>
                    <CardDescription>{pkg.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      {pkg.package_items.map(item => (
                        <li key={item.class_type}>{item.credits} credits for {item.class_type}</li>
                      ))}
                    </ul>
                  </CardContent>
                  <div className="p-4 pt-0">
                    <Button className="w-full" onClick={() => handleAcquirePackage(pkg.id)}>
                      Acquire for Next Month
                    </Button>
                  </div>
                </Card>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default PackagesPage;