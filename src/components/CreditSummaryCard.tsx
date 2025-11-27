import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { format, addMonths } from "date-fns";
import { enGB } from "date-fns/locale";

interface CreditSummaryCardProps {
  loading: boolean;
  currentMonthPackage: any;
  nextMonthPackage: any;
  remainingCredits: Record<string, number>;
  nextMonthRemainingCredits: Record<string, number>;
}

const CreditSummaryCard = ({ loading, currentMonthPackage, nextMonthPackage, remainingCredits, nextMonthRemainingCredits }: CreditSummaryCardProps) => {
  if (loading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-3/4" />
          <Separator />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Credit Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-gray-800 capitalize">{format(new Date(), "MMMM yyyy", { locale: enGB })}</h3>
          {currentMonthPackage ? (
            <div className="mt-2 text-sm text-gray-600">
              <p className="font-medium text-gray-700">{currentMonthPackage.packages.name}</p>
              <ul className="list-disc pl-5 mt-1">
                {currentMonthPackage.packages.package_items.map((item: any) => (
                  <li key={item.class_type}>
                    <strong>{item.class_type}:</strong> {remainingCredits[item.class_type] ?? item.credits} / {item.credits} credits remaining
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-2">No active package for this month.</p>
          )}
        </div>
        <Separator />
        <div>
          <h3 className="font-semibold text-gray-800 capitalize">{format(addMonths(new Date(), 1), "MMMM yyyy", { locale: enGB })}</h3>
          {nextMonthPackage ? (
            <div className="mt-2 text-sm text-gray-600">
              <p className="font-medium text-gray-700">{nextMonthPackage.packages.name}</p>
              <ul className="list-disc pl-5 mt-1">
                {nextMonthPackage.packages.package_items.map((item: any) => (
                  <li key={item.class_type}>
                    <strong>{item.class_type}:</strong> {nextMonthRemainingCredits[item.class_type] ?? item.credits} / {item.credits} credits remaining
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-2">No package acquired for next month.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CreditSummaryCard;