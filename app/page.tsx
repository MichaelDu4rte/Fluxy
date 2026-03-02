import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Page() {
    return <div className="flex justify-center items-center h-screen">
        <div className="flex flex-col gap-4">
            <Button asChild>
                <Link href="/signin">Login</Link>
            </Button>
            <Button variant="outline" asChild>
                <Link href="/signup">Register</Link>
            </Button>
            <Button variant="outline" asChild>
                <Link href="/dashboard">Dashboard</Link>
            </Button>
        </div>
    </div>;
}