import React from "react";
import { Link } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

export interface BreadcrumbItemData {
  label: string;
  to?: string;
  params?: Record<string, string>;
}

export interface SiteBreadcrumbProps {
  items: BreadcrumbItemData[];
  className?: string;
}

export function SiteBreadcrumb({ items, className }: SiteBreadcrumbProps) {
  return (
    <Breadcrumb
      className={cn("py-3 text-[11px] uppercase tracking-wider text-muted-foreground", className)}
    >
      <BreadcrumbList className="gap-1 sm:gap-1.5">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/" className="hover:text-primary transition-colors">
              Home
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <React.Fragment key={`${item.label}-${idx}`}>
              <BreadcrumbSeparator className="text-muted-foreground/30 [&>svg]:size-3" />
              <BreadcrumbItem>
                {isLast || !item.to ? (
                  <BreadcrumbPage className="font-medium text-foreground tracking-wider">
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    {item.params ? (
                      <Link
                        to={item.to}
                        params={item.params}
                        className="hover:text-primary transition-colors"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <Link to={item.to} className="hover:text-primary transition-colors">
                        {item.label}
                      </Link>
                    )}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
