import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { requestAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { RentalRequest } from "@/types";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: RentalRequest;
    onPaymentSuccess: () => void;
}

export function PaymentModal({ isOpen, onClose, request, onPaymentSuccess }: PaymentModalProps) {
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handlePayment = async () => {
        try {
            setIsProcessing(true);

            // Simulate processing delay for effect
            await new Promise(resolve => setTimeout(resolve, 1500));

            await requestAPI.payRequest(request.id);

            setIsSuccess(true);

            // Close after delay
            setTimeout(() => {
                onPaymentSuccess();
                onClose();
                setIsSuccess(false); // Reset for next time
            }, 3000);

        } catch (error: any) {
            console.error('Payment error:', error);
            toast({
                title: "Payment Failed",
                description: error.response?.data?.error || "Transaction failed. Please try again.",
                variant: "destructive",
            });
            if (error.response?.data?.error === 'Payment time expired. Request cancelled.') {
                onClose();
                onPaymentSuccess(); // To refresh list and show rejected status
            }
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    if (isSuccess) {
        return (
            <Dialog open={isOpen} onOpenChange={() => { }}>
                <DialogContent className="sm:max-w-md bg-success text-success-foreground border-none flex flex-col items-center justify-center min-h-[300px]">
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                        <div className="bg-white rounded-full p-4 mb-4 shadow-lg">
                            <CheckCircle2 className="h-16 w-16 text-success animate-bounce" />
                        </div>
                        <DialogTitle className="text-3xl font-bold text-white mb-2">Payment Successful!</DialogTitle>
                        <DialogDescription className="text-white/90 text-center text-lg">
                            Your agreement has been generated secured by blockchain.
                        </DialogDescription>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Complete Rental Payment</DialogTitle>
                    <DialogDescription>
                        Pay the advance amount to finalize your agreement.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="flex flex-col items-center justify-center p-6 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Total Amount Due</p>
                        <p className="text-4xl font-bold text-primary">
                            ₹{(request.finalRent || request.proposedRent).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            (One Month Advance Rent)
                        </p>
                    </div>
                </div>

                <DialogFooter className="sm:justify-start">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={isProcessing}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        className="flex-1 bg-gradient-primary"
                        onClick={handlePayment}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            "Confirm Payment"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
