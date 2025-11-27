import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import { startOfMonth, endOfMonth, addMonths, format } from "date-fns";
import { enGB } from "date-fns/locale";
import { Package } from "./admin/Packages";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const PackagesPage = () => {
  const { user } = useAuth();
  const [availablePackages, setAvailablePackages] = useState<Package[]>([]);
  const [currentUserPackage, setCurrentUserPackage] = useState<any>(null);
  const [nextMonthUserPackage, setNextMonthUserPackage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [remainingCredits, setRemainingCredits] = useState<Record<string, number>>({});

  const fetchPageData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const today = new Date();
      const currentMonthStart = startOfMonth(today);
      const currentMonthEnd = endOfMonth(today);
      const nextMonth = addMonths(today, 1);
      const nextMonthStart = startOfMonth(nextMonth);
      const nextMonthEnd = endOfMonth(nextMonth);

      const [
        { data: packagesData, error: packagesError },
        { data: currentUserPackageData, error: currentUserPackageError },
        { data: nextMonthUserPackageData, error: nextMonthUserPackageError }
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
          .single(),
        supabase
          .from("user_packages")
          .select("*, packages(*, package_items(*))")
          .eq("user_id", user.id)
          .gte("valid_from", format(nextMonthStart, 'yyyy-MM-dd'))
          .lte("valid_until", format(nextMonthEnd, 'yyyy-MM-dd'))
          .single()
      ]);

      if (packagesError) throw packagesError;
      if (currentUserPackageError && currentUserPackageError.code !== 'PGRST116') throw currentUserPackageError;
      if (nextMonthUserPackageError && nextMonthUserPackageError.code !== 'PGRST116') throw nextMonthUserPackageError;

      setAvailablePackages(packagesData || []);
      setCurrentUserPackage(currentUserPackageData);
      setNextMonthUserPackage(nextMonthUserPackageData);

      // Calculate remaining credits for the current month
      if (currentUserPackageData) {
        const { data: monthBookings, error: monthBookingsError } = await supabase
          .from('bookings')
          .select('classes(type)')
          .eq('user_id', user.id)
          .gte('booking_date', format(currentMonthStart, 'yyyy-MM-dd'))
          .lte('booking_date', format(currentMonthEnd, 'yyyy-MM-dd'));

        if (monthBookingsError) throw monthBookingsError;

        const usedCredits: Record<string, number> = (monthBookings || []).reduce((acc, booking) => {
          const type = (booking.classes as any)?.type;
          if (type) {
            acc[type] = (acc[type] || 0) + 1;
          }
          return acc;
        }, {});

        const creditsInfo: Record<string, number> = {};
        currentUserPackageData.packages.package_items.forEach((item: any) => {
          creditsInfo[item.class_type] = item.credits - (usedCredits[item.class_type] || 0);
        });
        setRemainingCredits(creditsInfo);
      } else {
        setRemainingCredits({});
      }

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

  const isNextMonthPackageAcquired = !!nextMonthUserPackage;

  return (
    <div className="p-4 md:p-6 space-y-8">
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>My Packages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-800 capitalize">{format(new Date(), "MMMM yyyy", { locale: enGB })}</h3>
                {currentUserPackage ? (
                  <div className="mt-2">
                    <p className="text-lg font-medium">{currentUserPackage.packages.name}</p>
                    <p className="text-sm text-gray-600 mb-3">{currentUserPackage.packages.description}</p>
                    <h4 className="text-sm font-medium text-gray-700">Remaining Credits:</h4>
                    <ul className="list-disc pl-5 text-sm text-gray-600">
                      {currentUserPackage.packages.package_items.map((item: any) => (
                        <li key={item.class_type}>
                          <strong>{item.class_type}:</strong> {remainingCredits[item.class_type] ?? item.credits} / {item.credits}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-2">You do not have an active package for this month.</p>
                )}
              </div>
              <Separator />
              <div>
                <h3 className="font-semibold text-gray-800 capitalize">{format(addMonths(new Date(), 1), "MMMM yyyy", { locale: enGB })}</h3>
                {nextMonthUserPackage ? (
                  <div className="mt-2">
                    <p className="text-lg font-medium">{nextMonthUserPackage.packages.name}</p>
                    <p className="text-sm text-gray-600 mb-3">{nextMonthUserPackage.packages.description}</p>
                     <h4 className="text-sm font-medium text-gray-700">Package Includes:</h4>
                    <ul className="list-disc pl-5 text-sm text-gray-600">
                      {nextMonthUserPackage.packages.package_items.map((item: any) => (
                        <li key={item.class_type}>
                          <strong>{item.class_type}:</strong> {item.credits} credits
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-2">You have not acquired a package for next month yet.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available Packages</CardTitle>
              <CardDescription>Acquire a package for next month.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availablePackages.map(pkg => {
                const isThisPackageAcquired = isNextMonthPackageAcquired && nextMonthUserPackage.package_id === pkg.id;
                return (
                  <Card key={pkg.id} className={`flex flex-col ${isThisPackageAcquired ? 'border-primary ring-2 ring-primary' : ''}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle>{pkg.name}</CardTitle>
                        <div className="text-xl font-bold text-gray-800">
                          {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(pkg.price)}
                        </div>
                      </div>
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
                      <Button 
                        className={cn("w-full", isThisPackageAcquired && "bg-green-500 hover:bg-green-600")}
                        onClick={() => handleAcquirePackage(pkg.id)}
                        disabled={isNextMonthPackageAcquired}
                      >
                        {isThisPackageAcquired ? "Acquired for Next Month" : isNextMonthPackageAcquired ? "Next month's package acquired" : "Acquire for Next Month"}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default PackagesPage;