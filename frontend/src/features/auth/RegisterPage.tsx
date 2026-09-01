import { ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { DocumentTitle } from "../../components/common/DocumentTitle";
import { RegisterForm } from "./components/RegisterForm";

export function RegisterPage() {
  return (
    <>
      <DocumentTitle title="Create Account" />
      <Card className="w-full shadow-2xl border-border/80 bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-2 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Create SecStorage Account
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Set up your identity and initial secure object storage space
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-2">
          <RegisterForm />
        </CardContent>
      </Card>
    </>
  );
}

export default RegisterPage;
