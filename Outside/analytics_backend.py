# Add these endpoints to your FastAPI main.py file

from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict
from collections import defaultdict, Counter
import calendar

# Analytics Models
class AnalyticsSummary(BaseModel):
    total_visitors: int
    active_visitors: int
    today_visitors: int
    avg_visit_duration: str
    popular_visit_purpose: str
    busiest_hour: str
    timestamp: datetime

class TrendsData(BaseModel):
    labels: List[str]
    datasets: List[Dict]

class VisitorTypeData(BaseModel):
    name: str
    count: int
    color: str
    legendFontColor: str

class HostAnalytics(BaseModel):
    name: str
    visitors: int
    department: str

# Helper functions for analytics
def get_date_range(period: str) -> tuple:
    """Get start and end dates for the specified period"""
    now = datetime.now(timezone.utc)
    
    if period == 'today':
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == 'week':
        start = now - timedelta(days=now.weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == 'month':
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == 'quarter':
        quarter_start_month = ((now.month - 1) // 3) * 3 + 1
        start = now.replace(month=quarter_start_month, day=1, hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == 'year':
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end = now
    else:
        # Default to week
        start = now - timedelta(days=7)
        end = now
    
    return start, end

async def calculate_avg_visit_duration() -> str:
    """Calculate average visit duration"""
    try:
        pipeline = [
            {
                "$match": {
                    "status": VisitorStatus.CHECKED_OUT,
                    "check_out_time": {"$exists": True},
                    "check_in_time": {"$exists": True}
                }
            },
            {
                "$addFields": {
                    "duration": {
                        "$subtract": ["$check_out_time", "$check_in_time"]
                    }
                }
            },
            {
                "$group": {
                    "_id": None,
                    "avg_duration": {"$avg": "$duration"}
                }
            }
        ]
        
        result = await visitors_collection.aggregate(pipeline).to_list(length=1)
        
        if result:
            avg_ms = result[0]["avg_duration"]
            avg_hours = avg_ms / (1000 * 60 * 60)
            hours = int(avg_hours)
            minutes = int((avg_hours - hours) * 60)
            return f"{hours}h {minutes}m"
        
        return "N/A"
    except Exception as e:
        print(f"Error calculating average duration: {e}")
        return "N/A"

async def get_popular_visit_purpose() -> str:
    """Get the most popular visit purpose"""
    try:
        pipeline = [
            {
                "$group": {
                    "_id": "$data.visit_purpose",
                    "count": {"$sum": 1}
                }
            },
            {
                "$sort": {"count": -1}
            },
            {
                "$limit": 1
            }
        ]
        
        result = await visitors_collection.aggregate(pipeline).to_list(length=1)
        
        if result and result[0]["_id"]:
            return result[0]["_id"]
        
        return "Meeting"
    except Exception as e:
        print(f"Error getting popular visit purpose: {e}")
        return "Meeting"

async def get_busiest_hour() -> str:
    """Get the busiest hour of the day"""
    try:
        pipeline = [
            {
                "$addFields": {
                    "hour": {"$hour": "$check_in_time"}
                }
            },
            {
                "$group": {
                    "_id": "$hour",
                    "count": {"$sum": 1}
                }
            },
            {
                "$sort": {"count": -1}
            },
            {
                "$limit": 1
            }
        ]
        
        result = await visitors_collection.aggregate(pipeline).to_list(length=1)
        
        if result:
            hour = result[0]["_id"]
            if hour == 0:
                return "12:00 AM"
            elif hour < 12:
                return f"{hour}:00 AM"
            elif hour == 12:
                return "12:00 PM"
            else:
                return f"{hour - 12}:00 PM"
        
        return "2:00 PM"
    except Exception as e:
        print(f"Error getting busiest hour: {e}")
        return "2:00 PM"

# Analytics Endpoints

@app.get("/analytics/summary", response_model=AnalyticsSummary)
async def get_analytics_summary():
    """Get comprehensive visitor analytics summary"""
    try:
        # Get basic counts
        total_visitors = await visitors_collection.count_documents({})
        active_visitors = await visitors_collection.count_documents({"status": VisitorStatus.CHECKED_IN})
        
        # Get today's visitors
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_visitors = await visitors_collection.count_documents({
            "check_in_time": {"$gte": today_start}
        })
        
        # Get calculated metrics
        avg_duration = await calculate_avg_visit_duration()
        popular_purpose = await get_popular_visit_purpose()
        busiest_hour = await get_busiest_hour()
        
        return AnalyticsSummary(
            total_visitors=total_visitors,
            active_visitors=active_visitors,
            today_visitors=today_visitors,
            avg_visit_duration=avg_duration,
            popular_visit_purpose=popular_purpose,
            busiest_hour=busiest_hour,
            timestamp=datetime.now(timezone.utc)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting analytics summary: {str(e)}")

@app.get("/analytics/trends")
async def get_visitor_trends(period: str = "week"):
    """Get visitor trends over time"""
    try:
        start_date, end_date = get_date_range(period)
        
        # Create aggregation pipeline based on period
        if period == 'today':
            # Group by hour for today
            pipeline = [
                {
                    "$match": {
                        "check_in_time": {"$gte": start_date, "$lte": end_date}
                    }
                },
                {
                    "$addFields": {
                        "hour": {"$hour": "$check_in_time"}
                    }
                },
                {
                    "$group": {
                        "_id": "$hour",
                        "count": {"$sum": 1}
                    }
                },
                {
                    "$sort": {"_id": 1}
                }
            ]
            labels = [f"{i}:00" for i in range(8, 19)]  # 8 AM to 6 PM
        elif period == 'week':
            # Group by day of week
            pipeline = [
                {
                    "$match": {
                        "check_in_time": {"$gte": start_date, "$lte": end_date}
                    }
                },
                {
                    "$addFields": {
                        "dayOfWeek": {"$dayOfWeek": "$check_in_time"}
                    }
                },
                {
                    "$group": {
                        "_id": "$dayOfWeek",
                        "count": {"$sum": 1}
                    }
                },
                {
                    "$sort": {"_id": 1}
                }
            ]
            labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        elif period == 'month':
            # Group by day of month
            pipeline = [
                {
                    "$match": {
                        "check_in_time": {"$gte": start_date, "$lte": end_date}
                    }
                },
                {
                    "$addFields": {
                        "day": {"$dayOfMonth": "$check_in_time"}
                    }
                },
                {
                    "$group": {
                        "_id": "$day",
                        "count": {"$sum": 1}
                    }
                },
                {
                    "$sort": {"_id": 1}
                }
            ]
            days_in_month = calendar.monthrange(end_date.year, end_date.month)[1]
            labels = [str(i) for i in range(1, days_in_month + 1)]
        else:
            # Default to week view
            pipeline = [
                {
                    "$match": {
                        "check_in_time": {"$gte": start_date, "$lte": end_date}
                    }
                },
                {
                    "$addFields": {
                        "dayOfWeek": {"$dayOfWeek": "$check_in_time"}
                    }
                },
                {
                    "$group": {
                        "_id": "$dayOfWeek",
                        "count": {"$sum": 1}
                    }
                },
                {
                    "$sort": {"_id": 1}
                }
            ]
            labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        
        results = await visitors_collection.aggregate(pipeline).to_list(length=None)
        
        # Create data array matching labels
        data_dict = {result["_id"]: result["count"] for result in results}
        data = []
        
        for i, label in enumerate(labels):
            if period == 'today':
                # Hour-based (8 AM = hour 8)
                hour = i + 8
                data.append(data_dict.get(hour, 0))
            elif period == 'week':
                # Day of week (1=Sunday, 2=Monday, etc.)
                day = i + 1
                data.append(data_dict.get(day, 0))
            elif period == 'month':
                # Day of month
                day = i + 1
                data.append(data_dict.get(day, 0))
            else:
                data.append(data_dict.get(i + 1, 0))
        
        return {
            "labels": labels,
            "datasets": [{
                "data": data,
                "color": "(opacity = 1) => `rgba(37, 99, 235, ${opacity})`",
                "strokeWidth": 3
            }]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting visitor trends: {str(e)}")

@app.get("/analytics/visitor-types")
async def get_visitor_types(period: str = "week"):
    """Get visitor types distribution"""
    try:
        start_date, end_date = get_date_range(period)
        
        pipeline = [
            {
                "$match": {
                    "check_in_time": {"$gte": start_date, "$lte": end_date}
                }
            },
            {
                "$group": {
                    "_id": "$data.visit_purpose",
                    "count": {"$sum": 1}
                }
            },
            {
                "$sort": {"count": -1}
            }
        ]
        
        results = await visitors_collection.aggregate(pipeline).to_list(length=None)
        
        # Define colors for different visit types
        colors = ['#2563eb', '#16a34a', '#dc2626', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16']
        
        visitor_types = []
        for i, result in enumerate(results[:7]):  # Limit to top 7
            visitor_types.append({
                "name": result["_id"] or "Other",
                "count": result["count"],
                "color": colors[i % len(colors)],
                "legendFontColor": "#374151"
            })
        
        return visitor_types
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting visitor types: {str(e)}")

@app.get("/analytics/peak-hours")
async def get_peak_hours(period: str = "week"):
    """Get peak hours analysis"""
    try:
        start_date, end_date = get_date_range(period)
        
        pipeline = [
            {
                "$match": {
                    "check_in_time": {"$gte": start_date, "$lte": end_date}
                }
            },
            {
                "$addFields": {
                    "hour": {"$hour": "$check_in_time"}
                }
            },
            {
                "$match": {
                    "hour": {"$gte": 8, "$lte": 18}  # Business hours 8 AM to 6 PM
                }
            },
            {
                "$group": {
                    "_id": "$hour",
                    "count": {"$sum": 1}
                }
            },
            {
                "$sort": {"_id": 1}
            }
        ]
        
        results = await visitors_collection.aggregate(pipeline).to_list(length=None)
        
        # Create hourly data for business hours
        labels = []
        data = []
        
        for hour in range(8, 19, 2):  # 8 AM, 10 AM, 12 PM, 2 PM, 4 PM, 6 PM
            if hour == 12:
                labels.append("12PM")
            elif hour > 12:
                labels.append(f"{hour - 12}PM")
            else:
                labels.append(f"{hour}AM")
        
        # Get data for each 2-hour period
        data_dict = {result["_id"]: result["count"] for result in results}
        
        for hour in range(8, 19, 2):
            # Sum visitors for 2-hour periods
            period_count = data_dict.get(hour, 0) + data_dict.get(hour + 1, 0)
            data.append(period_count)
        
        return {
            "labels": labels,
            "datasets": [{
                "data": data,
                "color": "(opacity = 1) => `rgba(34, 197, 94, ${opacity})`"
            }]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting peak hours: {str(e)}")

@app.get("/analytics/hosts", response_model=List[HostAnalytics])
async def get_host_analytics(period: str = "week", limit: int = 5):
    """Get top hosts by visitor count"""
    try:
        start_date, end_date = get_date_range(period)
        
        pipeline = [
            {
                "$match": {
                    "check_in_time": {"$gte": start_date, "$lte": end_date},
                    "data.host_name": {"$exists": True, "$ne": ""}
                }
            },
            {
                "$group": {
                    "_id": "$data.host_name",
                    "visitors": {"$sum": 1},
                    # Try to get department from first visitor entry
                    "sample_data": {"$first": "$data"}
                }
            },
            {
                "$sort": {"visitors": -1}
            },
            {
                "$limit": limit
            }
        ]
        
        results = await visitors_collection.aggregate(pipeline).to_list(length=None)
        
        # Default departments for demo (in production, you'd have a hosts table)
        default_departments = [
            "Sales", "HR", "Engineering", "Marketing", "Operations", 
            "Finance", "Legal", "IT", "Customer Success", "Product"
        ]
        
        hosts = []
        for i, result in enumerate(results):
            hosts.append(HostAnalytics(
                name=result["_id"],
                visitors=result["visitors"],
                department=result.get("sample_data", {}).get("department", 
                                    default_departments[i % len(default_departments)])
            ))
        
        return hosts
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting host analytics: {str(e)}")

@app.get("/analytics/export")
async def export_analytics_report(
    period: str = "month", 
    format: str = "json"
):
    """Export comprehensive analytics report"""
    try:
        start_date, end_date = get_date_range(period)
        
        # Get all visitors in period
        visitors = await visitors_collection.find({
            "check_in_time": {"$gte": start_date, "$lte": end_date}
        }).to_list(length=None)
        
        # Compile comprehensive report
        report = {
            "period": period,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "summary": {
                "total_visitors": len(visitors),
                "unique_companies": len(set(v.get("data", {}).get("company", "") for v in visitors if v.get("data", {}).get("company"))),
                "unique_hosts": len(set(v.get("data", {}).get("host_name", "") for v in visitors if v.get("data", {}).get("host_name"))),
                "avg_visitors_per_day": len(visitors) / max(1, (end_date - start_date).days),
            },
            "visitors": [
                {
                    "id": str(visitor["_id"]),
                    "name": visitor.get("data", {}).get("full_name"),
                    "company": visitor.get("data", {}).get("company"),
                    "host": visitor.get("data", {}).get("host_name"),
                    "purpose": visitor.get("data", {}).get("visit_purpose"),
                    "check_in": visitor["check_in_time"].isoformat(),
                    "check_out": visitor.get("check_out_time").isoformat() if visitor.get("check_out_time") else None,
                    "status": visitor["status"]
                }
                for visitor in visitors
            ]
        }
        
        if format.lower() == "csv":
            # Convert to CSV format
            import csv
            import io
            
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=[
                'name', 'company', 'host', 'purpose', 'check_in', 'check_out', 'status'
            ])
            writer.writeheader()
            
            for visitor in report["visitors"]:
                writer.writerow(visitor)
            
            return {
                "format": "csv",
                "data": output.getvalue(),
                "filename": f"visitor_report_{period}_{datetime.now().strftime('%Y%m%d')}.csv"
            }
        
        return report
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting report: {str(e)}")

@app.get("/analytics/real-time")
async def get_real_time_analytics():
    """Get real-time analytics for dashboard updates"""
    try:
        now = datetime.now(timezone.utc)
        
        # Active visitors
        active_visitors = await visitors_collection.find({
            "status": VisitorStatus.CHECKED_IN
        }).to_list(length=None)
        
        # Recent check-ins (last hour)
        recent_checkins = await visitors_collection.count_documents({
            "check_in_time": {"$gte": now - timedelta(hours=1)}
        })
        
        # Current hour visitors
        hour_start = now.replace(minute=0, second=0, microsecond=0)
        current_hour_visitors = await visitors_collection.count_documents({
            "check_in_time": {"$gte": hour_start, "$lt": hour_start + timedelta(hours=1)}
        })
        
        return {
            "timestamp": now.isoformat(),
            "active_visitors": len(active_visitors),
            "recent_checkins": recent_checkins,
            "current_hour_visitors": current_hour_visitors,
            "active_visitor_details": [
                {
                    "name": visitor.get("data", {}).get("full_name"),
                    "company": visitor.get("data", {}).get("company"),
                    "check_in_time": visitor["check_in_time"].isoformat(),
                    "host": visitor.get("data", {}).get("host_name")
                }
                for visitor in active_visitors[:10]  # Limit to 10 most recent
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting real-time analytics: {str(e)}")

@app.get("/analytics/department-summary")
async def get_department_summary(period: str = "month"):
    """Get visitor summary by department/host"""
    try:
        start_date, end_date = get_date_range(period)
        
        pipeline = [
            {
                "$match": {
                    "check_in_time": {"$gte": start_date, "$lte": end_date}
                }
            },
            {
                "$group": {
                    "_id": {
                        "host": "$data.host_name",
                        "purpose": "$data.visit_purpose"
                    },
                    "count": {"$sum": 1},
                    "avg_duration": {
                        "$avg": {
                            "$cond": [
                                {"$and": [
                                    {"$ne": ["$check_out_time", None]},
                                    {"$ne": ["$check_in_time", None]}
                                ]},
                                {"$subtract": ["$check_out_time", "$check_in_time"]},
                                None
                            ]
                        }
                    }
                }
            },
            {
                "$group": {
                    "_id": "$_id.host",
                    "total_visitors": {"$sum": "$count"},
                    "visit_types": {
                        "$push": {
                            "purpose": "$_id.purpose",
                            "count": "$count"
                        }
                    },
                    "avg_duration_ms": {"$avg": "$avg_duration"}
                }
            },
            {
                "$sort": {"total_visitors": -1}
            }
        ]
        
        results = await visitors_collection.aggregate(pipeline).to_list(length=None)
        
        # Format the results
        department_summary = []
        for result in results:
            if result["_id"]:  # Skip null host names
                avg_duration = "N/A"
                if result.get("avg_duration_ms"):
                    duration_hours = result["avg_duration_ms"] / (1000 * 60 * 60)
                    hours = int(duration_hours)
                    minutes = int((duration_hours - hours) * 60)
                    avg_duration = f"{hours}h {minutes}m"
                
                department_summary.append({
                    "host_name": result["_id"],
                    "total_visitors": result["total_visitors"],
                    "avg_duration": avg_duration,
                    "visit_types": result["visit_types"]
                })
        
        return department_summary
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting department summary: {str(e)}")
        