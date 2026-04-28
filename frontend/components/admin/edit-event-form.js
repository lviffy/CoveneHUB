"use client";

function _extends() {
  return (
    (_extends = Object.assign
      ? Object.assign.bind()
      : function (n) {
          for (var e = 1; e < arguments.length; e++) {
            var t = arguments[e];
            for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
          }
          return n;
        }),
    _extends.apply(null, arguments)
  );
}
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/convene/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, X, ImageIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { format } from "date-fns";
import {
  validateImageFile,
  generateSecureFilename,
} from "@/lib/validation/file";
import { extractUploadPath, resolveAssetUrl } from "@/lib/storage";

// Form validation schema
const eventFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  venue_name: z.string().min(3, "Venue name is required"),
  venue_address: z
    .string()
    .min(5, "Venue address must be at least 5 characters"),
  city: z.string().min(2, "City is required"),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  date_time: z.string().min(1, "Date and time are required"),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
  ticket_price: z.coerce.number().min(0, "Price must be 0 or greater"),
  vip_ticket_price: z.preprocess(
    (value) =>
      value === "" || value === null || value === undefined
        ? undefined
        : Number(value),
    z.number().min(0, "VIP price must be 0 or greater").optional(),
  ),
  platform_commission_percentage: z.coerce
    .number()
    .min(0, "Commission must be 0 or greater")
    .max(100, "Commission cannot exceed 100%"),
  event_image: z.string().optional(),
  entry_instructions: z.string().optional(),
  terms: z.string().optional(),
  status: z.enum([
    "draft",
    "published",
    "checkin_open",
    "in_progress",
    "ended",
  ]),
});
export default function EditEventForm({
  event,
  actorRole = "admin_team",
  successRedirectPath = "/admin",
  cancelRedirectPath = "/admin",
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(event.event_image || "");
  const [bookedTickets] = useState(() => {
    const capacity = Number(event.capacity || 0);
    const remaining = Number(event.remaining || 0);
    return Math.max(0, capacity - remaining);
  });
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  // Format date_time for input (YYYY-MM-DDTHH:MM format)
  const formatDateTimeForInput = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, "yyyy-MM-dd'T'HH:mm");
    } catch (error) {
      return "";
    }
  };
  const form = useForm({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: event.title || "",
      description: event.description || "",
      venue_name: event.venue_name || "",
      venue_address: event.venue_address || "",
      city: event.city || "",
      latitude: event.latitude?.toString() || "",
      longitude: event.longitude?.toString() || "",
      date_time: formatDateTimeForInput(event.date_time),
      capacity: event.capacity || 50,
      ticket_price: event.ticket_price || 0,
      vip_ticket_price: event.vip_ticket_price ?? undefined,
      platform_commission_percentage:
        event.platform_commission_percentage || 10,
      event_image: event.event_image || "",
      entry_instructions: event.entry_instructions || "",
      terms: event.terms || "",
      status: event.status || "draft",
    },
  });
  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const totalTickets = bookedTickets;
      const newRemaining = data.capacity - totalTickets;
      if (newRemaining < 0) {
        toast({
          title: "Invalid capacity",
          description: `Capacity cannot be less than current tickets booked (${totalTickets} tickets booked)`,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Update event in database
      const updateData = {
        title: data.title,
        description: data.description,
        venue_name: data.venue_name,
        venue_address: data.venue_address,
        city: data.city,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        date_time: new Date(data.date_time).toISOString(),
        capacity: data.capacity,
        remaining: newRemaining,
        ticket_price: data.ticket_price,
        ...(data.vip_ticket_price !== undefined
          ? {
              vip_ticket_price: data.vip_ticket_price,
            }
          : {}),
        platform_commission_percentage: data.platform_commission_percentage,
        event_image: data.event_image || null,
        entry_instructions: data.entry_instructions || null,
        terms: data.terms || null,
        status: data.status,
      };

      // @ts-ignore - Supabase type mismatch
      const { error } = await supabase
        .from("events")
        .update(updateData)
        .eq("event_id", event.event_id);
      if (error) {
        throw error;
      }

      // Log the action in audit logs
      await supabase.from("audit_logs").insert({
        actor_id: event.created_by || "",
        actor_role: actorRole,
        action: "UPDATE_EVENT",
        entity: "events",
        entity_id: event.event_id,
      });
      toast({
        title: "Success!",
        description: `Event "${data.title}" has been updated.`,
      });
      router.push(successRedirectPath);
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error.message || "Failed to update event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Comprehensive validation using validation utility
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({
        title: "Invalid file",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }
    setIsUploading(true);
    try {
      // Delete old image from storage if it exists
      const currentImage = form.getValues("event_image");
      if (currentImage) {
        try {
          const filePath = extractUploadPath(currentImage);
          if (filePath) {
            await supabase.storage.from("events").remove([filePath]);
          }
        } catch (urlError) {}
      }

      // Generate secure filename with validated extension
      const fileName = generateSecureFilename(file.name);
      const filePath = `events/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("events")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });
      if (error) {
        throw error;
      }
      const publicUrl =
        data?.publicUrl || resolveAssetUrl(data?.path || filePath);

      // Update form field and preview
      form.setValue("event_image", publicUrl);
      setImagePreview(publicUrl);
      toast({
        title: "Image uploaded",
        description: "Event poster uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };
  const handleRemoveImage = async () => {
    const currentImage = form.getValues("event_image");

    // Delete from storage if image exists
    if (currentImage) {
      try {
        const filePath = extractUploadPath(currentImage);
        if (filePath) {
          // Delete from storage
          const { data, error: storageError } = await supabase.storage
            .from("events")
            .remove([filePath]);
          if (storageError) {
            toast({
              title: "Warning",
              description: `Storage cleanup failed: ${storageError.message}`,
              variant: "destructive",
            });
          } else {
            // Verify deletion by trying to get the file (should fail)
            const { data: listData, error: listError } = await supabase.storage
              .from("events")
              .list(filePath.split("/")[0], {
                search: filePath.split("/").pop(),
              });
            toast({
              title: "Image removed",
              description:
                "Event poster has been removed and deleted from storage",
            });
          }
        } else {
          toast({
            title: "Warning",
            description:
              "Could not determine the uploaded image path for deletion",
            variant: "destructive",
          });
        }
      } catch (urlError) {
        toast({
          title: "Error",
          description: "Failed to parse image URL",
          variant: "destructive",
        });
      }
    }
    form.setValue("event_image", "");
    setImagePreview("");
  };
  return /*#__PURE__*/ React.createElement(
    Form,
    form,
    /*#__PURE__*/ React.createElement(
      "form",
      {
        onSubmit: form.handleSubmit(onSubmit),
        className: "space-y-6",
      },
      /*#__PURE__*/ React.createElement(FormField, {
        control: form.control,
        name: "title",
        render: ({ field }) =>
          /*#__PURE__*/ React.createElement(
            FormItem,
            null,
            /*#__PURE__*/ React.createElement(FormLabel, null, "Event Title *"),
            /*#__PURE__*/ React.createElement(
              FormControl,
              null,
              /*#__PURE__*/ React.createElement(
                Input,
                _extends(
                  {
                    placeholder: "e.g., Startup Summit 2026 - Day 1",
                  },
                  field,
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(FormMessage, null),
          ),
      }),
      /*#__PURE__*/ React.createElement(FormField, {
        control: form.control,
        name: "description",
        render: ({ field }) =>
          /*#__PURE__*/ React.createElement(
            FormItem,
            null,
            /*#__PURE__*/ React.createElement(FormLabel, null, "Description *"),
            /*#__PURE__*/ React.createElement(
              FormControl,
              null,
              /*#__PURE__*/ React.createElement(
                Textarea,
                _extends(
                  {
                    placeholder: "Describe the event experience...",
                    className: "min-h-[100px]",
                  },
                  field,
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(FormMessage, null),
          ),
      }),
      /*#__PURE__*/ React.createElement(FormField, {
        control: form.control,
        name: "event_image",
        render: ({ field }) =>
          /*#__PURE__*/ React.createElement(
            FormItem,
            null,
            /*#__PURE__*/ React.createElement(FormLabel, null, "Event Poster"),
            /*#__PURE__*/ React.createElement(
              FormControl,
              null,
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "space-y-4",
                },
                imagePreview
                  ? /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className: "relative",
                      },
                      /*#__PURE__*/ React.createElement("img", {
                        src: resolveAssetUrl(imagePreview),
                        alt: "Event poster preview",
                        className:
                          "w-full max-w-md h-64 object-cover rounded-lg",
                      }),
                      /*#__PURE__*/ React.createElement(
                        Button,
                        {
                          type: "button",
                          variant: "destructive",
                          size: "icon",
                          className: "absolute top-2 right-2",
                          onClick: handleRemoveImage,
                        },
                        /*#__PURE__*/ React.createElement(X, {
                          className: "h-4 w-4",
                        }),
                      ),
                    )
                  : /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className: "flex items-center justify-center w-full",
                      },
                      /*#__PURE__*/ React.createElement(
                        "label",
                        {
                          htmlFor: "image-upload",
                          className:
                            "flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100",
                        },
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className:
                              "flex flex-col items-center justify-center pt-5 pb-6",
                          },
                          /*#__PURE__*/ React.createElement(ImageIcon, {
                            className: "w-12 h-12 mb-3 text-gray-400",
                          }),
                          /*#__PURE__*/ React.createElement(
                            "p",
                            {
                              className: "mb-2 text-sm text-gray-500",
                            },
                            /*#__PURE__*/ React.createElement(
                              "span",
                              {
                                className: "font-semibold",
                              },
                              "Click to upload",
                            ),
                            " or drag and drop",
                          ),
                          /*#__PURE__*/ React.createElement(
                            "p",
                            {
                              className: "text-xs text-gray-500",
                            },
                            "PNG, JPG (MAX. 5MB)",
                          ),
                          /*#__PURE__*/ React.createElement(
                            "p",
                            {
                              className: "text-xs text-gray-400 mt-1",
                            },
                            "Recommended: 1920x560px",
                          ),
                        ),
                        /*#__PURE__*/ React.createElement("input", {
                          id: "image-upload",
                          type: "file",
                          className: "hidden",
                          accept: "image/*",
                          onChange: handleImageUpload,
                          disabled: isUploading,
                        }),
                      ),
                    ),
                isUploading &&
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "flex items-center gap-2 text-sm text-gray-600",
                    },
                    /*#__PURE__*/ React.createElement(Spinner, {
                      className: "h-4 w-4 text-[#195ADC]",
                    }),
                    "Uploading image...",
                  ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              FormDescription,
              null,
              "Upload a poster image for the event (optional). Recommended dimensions: 1920x560px for best display quality.",
            ),
            /*#__PURE__*/ React.createElement(FormMessage, null),
          ),
      }),
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "grid grid-cols-1 md:grid-cols-2 gap-4",
        },
        /*#__PURE__*/ React.createElement(FormField, {
          control: form.control,
          name: "venue_name",
          render: ({ field }) =>
            /*#__PURE__*/ React.createElement(
              FormItem,
              null,
              /*#__PURE__*/ React.createElement(
                FormLabel,
                null,
                "Venue Name *",
              ),
              /*#__PURE__*/ React.createElement(
                FormControl,
                null,
                /*#__PURE__*/ React.createElement(
                  Input,
                  _extends(
                    {
                      placeholder: "e.g., Film City Studios",
                    },
                    field,
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(FormMessage, null),
            ),
        }),
        /*#__PURE__*/ React.createElement(FormField, {
          control: form.control,
          name: "city",
          render: ({ field }) =>
            /*#__PURE__*/ React.createElement(
              FormItem,
              null,
              /*#__PURE__*/ React.createElement(FormLabel, null, "City *"),
              /*#__PURE__*/ React.createElement(
                FormControl,
                null,
                /*#__PURE__*/ React.createElement(
                  Input,
                  _extends(
                    {
                      placeholder: "e.g., Mumbai, Hyderabad, Bangalore",
                    },
                    field,
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(FormMessage, null),
            ),
        }),
      ),
      /*#__PURE__*/ React.createElement(FormField, {
        control: form.control,
        name: "venue_address",
        render: ({ field }) =>
          /*#__PURE__*/ React.createElement(
            FormItem,
            null,
            /*#__PURE__*/ React.createElement(
              FormLabel,
              null,
              "Venue Address *",
            ),
            /*#__PURE__*/ React.createElement(
              FormControl,
              null,
              /*#__PURE__*/ React.createElement(
                Textarea,
                _extends(
                  {
                    placeholder: "Full venue address...",
                  },
                  field,
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(FormMessage, null),
          ),
      }),
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "grid grid-cols-1 md:grid-cols-2 gap-4",
        },
        /*#__PURE__*/ React.createElement(FormField, {
          control: form.control,
          name: "latitude",
          render: ({ field }) =>
            /*#__PURE__*/ React.createElement(
              FormItem,
              null,
              /*#__PURE__*/ React.createElement(FormLabel, null, "Latitude"),
              /*#__PURE__*/ React.createElement(
                FormControl,
                null,
                /*#__PURE__*/ React.createElement(
                  Input,
                  _extends(
                    {
                      placeholder: "e.g., 19.0760",
                    },
                    field,
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                FormDescription,
                null,
                "Optional GPS coordinate",
              ),
              /*#__PURE__*/ React.createElement(FormMessage, null),
            ),
        }),
        /*#__PURE__*/ React.createElement(FormField, {
          control: form.control,
          name: "longitude",
          render: ({ field }) =>
            /*#__PURE__*/ React.createElement(
              FormItem,
              null,
              /*#__PURE__*/ React.createElement(FormLabel, null, "Longitude"),
              /*#__PURE__*/ React.createElement(
                FormControl,
                null,
                /*#__PURE__*/ React.createElement(
                  Input,
                  _extends(
                    {
                      placeholder: "e.g., 72.8777",
                    },
                    field,
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                FormDescription,
                null,
                "Optional GPS coordinate",
              ),
              /*#__PURE__*/ React.createElement(FormMessage, null),
            ),
        }),
      ),
      /*#__PURE__*/ React.createElement(FormField, {
        control: form.control,
        name: "date_time",
        render: ({ field }) =>
          /*#__PURE__*/ React.createElement(
            FormItem,
            null,
            /*#__PURE__*/ React.createElement(FormLabel, null, "Date & Time *"),
            /*#__PURE__*/ React.createElement(
              FormControl,
              null,
              /*#__PURE__*/ React.createElement(
                Input,
                _extends(
                  {
                    type: "datetime-local",
                  },
                  field,
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(FormMessage, null),
          ),
      }),
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "grid grid-cols-1 md:grid-cols-2 gap-4",
        },
        /*#__PURE__*/ React.createElement(FormField, {
          control: form.control,
          name: "capacity",
          render: ({ field }) =>
            /*#__PURE__*/ React.createElement(
              FormItem,
              null,
              /*#__PURE__*/ React.createElement(FormLabel, null, "Capacity *"),
              /*#__PURE__*/ React.createElement(
                FormControl,
                null,
                /*#__PURE__*/ React.createElement(
                  Input,
                  _extends(
                    {
                      type: "number",
                      min: "1",
                    },
                    field,
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                FormDescription,
                null,
                "Current tickets booked: ",
                bookedTickets,
              ),
              /*#__PURE__*/ React.createElement(FormMessage, null),
            ),
        }),
        /*#__PURE__*/ React.createElement(FormField, {
          control: form.control,
          name: "ticket_price",
          render: ({ field }) =>
            /*#__PURE__*/ React.createElement(
              FormItem,
              null,
              /*#__PURE__*/ React.createElement(
                FormLabel,
                null,
                "General Ticket Price (\u20B9) *",
              ),
              /*#__PURE__*/ React.createElement(
                FormControl,
                null,
                /*#__PURE__*/ React.createElement(
                  Input,
                  _extends(
                    {
                      type: "number",
                      min: "0",
                      placeholder: "0",
                    },
                    field,
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                FormDescription,
                null,
                "Enter 0 for free events",
              ),
              /*#__PURE__*/ React.createElement(FormMessage, null),
            ),
        }),
        /*#__PURE__*/ React.createElement(FormField, {
          control: form.control,
          name: "vip_ticket_price",
          render: ({ field }) =>
            /*#__PURE__*/ React.createElement(
              FormItem,
              null,
              /*#__PURE__*/ React.createElement(
                FormLabel,
                null,
                "VIP Ticket Price (\u20B9) Optional",
              ),
              /*#__PURE__*/ React.createElement(
                FormControl,
                null,
                /*#__PURE__*/ React.createElement(Input, {
                  type: "number",
                  min: "0",
                  placeholder: "Leave blank to skip VIP tier",
                  value: field.value ?? "",
                  onChange: (event) => field.onChange(event.target.value),
                  onBlur: field.onBlur,
                  name: field.name,
                  ref: field.ref,
                }),
              ),
              /*#__PURE__*/ React.createElement(
                FormDescription,
                null,
                "Optional. Leave blank to keep only the General tier.",
              ),
              /*#__PURE__*/ React.createElement(FormMessage, null),
            ),
        }),
        /*#__PURE__*/ React.createElement(FormField, {
          control: form.control,
          name: "platform_commission_percentage",
          render: ({ field }) =>
            /*#__PURE__*/ React.createElement(
              FormItem,
              null,
              /*#__PURE__*/ React.createElement(
                FormLabel,
                null,
                "CONVENEHUB Commission (%) *",
              ),
              /*#__PURE__*/ React.createElement(
                FormControl,
                null,
                /*#__PURE__*/ React.createElement(
                  Input,
                  _extends(
                    {
                      type: "number",
                      min: "0",
                      max: "100",
                      step: "0.01",
                      placeholder: "10",
                    },
                    field,
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                FormDescription,
                null,
                "Platform commission (0-100). Default: 10%",
              ),
              /*#__PURE__*/ React.createElement(FormMessage, null),
            ),
        }),
      ),
      /*#__PURE__*/ React.createElement(FormField, {
        control: form.control,
        name: "entry_instructions",
        render: ({ field }) =>
          /*#__PURE__*/ React.createElement(
            FormItem,
            null,
            /*#__PURE__*/ React.createElement(
              FormLabel,
              null,
              "Entry Instructions",
            ),
            /*#__PURE__*/ React.createElement(
              FormControl,
              null,
              /*#__PURE__*/ React.createElement(
                Textarea,
                _extends(
                  {
                    placeholder: "Important information for attendees...",
                    className: "min-h-[100px]",
                  },
                  field,
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              FormDescription,
              null,
              "Share any special instructions or requirements",
            ),
            /*#__PURE__*/ React.createElement(FormMessage, null),
          ),
      }),
      /*#__PURE__*/ React.createElement(FormField, {
        control: form.control,
        name: "terms",
        render: ({ field }) =>
          /*#__PURE__*/ React.createElement(
            FormItem,
            null,
            /*#__PURE__*/ React.createElement(
              FormLabel,
              null,
              "Event Specific Terms & Conditions",
            ),
            /*#__PURE__*/ React.createElement(
              FormControl,
              null,
              /*#__PURE__*/ React.createElement(
                Textarea,
                _extends(
                  {
                    placeholder:
                      "Enter specific rules, NDA clauses, or terms for this event...",
                    className: "min-h-[120px]",
                  },
                  field,
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              FormDescription,
              null,
              "These terms will be shown to the user in a popup and they must agree before booking.",
            ),
            /*#__PURE__*/ React.createElement(FormMessage, null),
          ),
      }),
      /*#__PURE__*/ React.createElement(FormField, {
        control: form.control,
        name: "status",
        render: ({ field }) =>
          /*#__PURE__*/ React.createElement(
            FormItem,
            null,
            /*#__PURE__*/ React.createElement(
              FormLabel,
              null,
              "Event Status *",
            ),
            /*#__PURE__*/ React.createElement(
              Select,
              {
                onValueChange: field.onChange,
                value: field.value,
              },
              /*#__PURE__*/ React.createElement(
                FormControl,
                null,
                /*#__PURE__*/ React.createElement(
                  SelectTrigger,
                  null,
                  /*#__PURE__*/ React.createElement(SelectValue, {
                    placeholder: "Select status",
                  }),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                SelectContent,
                null,
                /*#__PURE__*/ React.createElement(
                  SelectItem,
                  {
                    value: "draft",
                  },
                  "Draft - Not visible to public",
                ),
                /*#__PURE__*/ React.createElement(
                  SelectItem,
                  {
                    value: "published",
                  },
                  "Published - Visible, bookings open",
                ),
                /*#__PURE__*/ React.createElement(
                  SelectItem,
                  {
                    value: "checkin_open",
                  },
                  "Check-in Open - Visible, bookings closed",
                ),
                /*#__PURE__*/ React.createElement(
                  SelectItem,
                  {
                    value: "in_progress",
                  },
                  "In Progress - Not visible, event ongoing",
                ),
                /*#__PURE__*/ React.createElement(
                  SelectItem,
                  {
                    value: "ended",
                  },
                  "Ended - Not visible, event completed",
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              FormDescription,
              null,
              "Control event visibility and booking availability",
            ),
            /*#__PURE__*/ React.createElement(FormMessage, null),
          ),
      }),
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "flex gap-4",
        },
        /*#__PURE__*/ React.createElement(
          Button,
          {
            type: "submit",
            disabled: isSubmitting || isUploading,
            className: "flex-1",
          },
          isSubmitting
            ? /*#__PURE__*/ React.createElement(
                React.Fragment,
                null,
                /*#__PURE__*/ React.createElement(Spinner, {
                  className: "mr-2 h-4 w-4 text-white",
                }),
                "Updating...",
              )
            : /*#__PURE__*/ React.createElement(
                React.Fragment,
                null,
                /*#__PURE__*/ React.createElement(Save, {
                  className: "mr-2 h-4 w-4",
                }),
                "Update Event",
              ),
        ),
        /*#__PURE__*/ React.createElement(
          Button,
          {
            type: "button",
            variant: "outline",
            onClick: () => router.push(cancelRedirectPath),
            disabled: isSubmitting,
          },
          "Cancel",
        ),
      ),
    ),
  );
}
