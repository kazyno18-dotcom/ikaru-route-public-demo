"""
シードデータ投入スクリプト
実行: python seed.py
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app import models
from app.auth import get_password_hash
from app.database import Base
from datetime import date, datetime, timedelta
import uuid

Base.metadata.create_all(bind=engine)

def seed():
    db = SessionLocal()
    try:
        # 既存データチェック
        if db.query(models.Staff).count() > 0:
            print("シードデータは既に投入済みです")
            return

        # ===== スタッフ登録 =====
        staff_data = [
            {"name": "管理者", "email": "admin@ikaruRoute.jp", "role": models.RoleEnum.admin,
             "skill_types": ["身体", "家事", "生活", "重度", "障がい"], "max_hours_day": 8.0, "hourly_rate": 3000},
            {"name": "コーディネーター田中", "email": "coordinator@ikaruRoute.jp", "role": models.RoleEnum.coordinator,
             "skill_types": ["身体", "家事", "生活"], "max_hours_day": 8.0, "hourly_rate": 2500},
            {"name": "日野", "email": "hino@ikaruRoute.jp", "role": models.RoleEnum.staff,
             "skill_types": ["身体", "家事", "生活"], "max_hours_day": 8.0, "hourly_rate": 1500},
            {"name": "中川", "email": "nakagawa@ikaruRoute.jp", "role": models.RoleEnum.staff,
             "skill_types": ["身体", "家事"], "max_hours_day": 6.0, "hourly_rate": 1400},
            {"name": "小田", "email": "oda@ikaruRoute.jp", "role": models.RoleEnum.staff,
             "skill_types": ["家事", "生活"], "max_hours_day": 8.0, "hourly_rate": 1400},
            {"name": "宇藤", "email": "uto@ikaruRoute.jp", "role": models.RoleEnum.staff,
             "skill_types": ["身体", "重度"], "max_hours_day": 8.0, "hourly_rate": 1600},
            {"name": "高野", "email": "takano@ikaruRoute.jp", "role": models.RoleEnum.staff,
             "skill_types": ["身体", "家事", "生活"], "max_hours_day": 8.0, "hourly_rate": 1500},
            {"name": "八木", "email": "yagi@ikaruRoute.jp", "role": models.RoleEnum.staff,
             "skill_types": ["身体", "障がい"], "max_hours_day": 8.0, "hourly_rate": 1600},
            {"name": "村岡", "email": "muraoka@ikaruRoute.jp", "role": models.RoleEnum.staff,
             "skill_types": ["家事", "生活"], "max_hours_day": 6.0, "hourly_rate": 1400},
            {"name": "忠手", "email": "tadade@ikaruRoute.jp", "role": models.RoleEnum.staff,
             "skill_types": ["身体", "家事"], "max_hours_day": 8.0, "hourly_rate": 1500},
        ]

        staff_objects = []
        for s in staff_data:
            staff = models.Staff(
                name=s["name"],
                email=s["email"],
                hashed_password=get_password_hash("password123"),
                role=s["role"],
                skill_types=s["skill_types"],
                max_hours_day=s["max_hours_day"],
                hourly_rate=s["hourly_rate"],
            )
            db.add(staff)
            staff_objects.append(staff)

        db.flush()

        # ===== 利用者登録 =====
        clients_data = [
            {"name": "鈴木様", "address": "東京都練馬区1-1-1", "care_level": models.CareLevelEnum.kaigo2,
             "service_type": models.ServiceTypeEnum.shintai, "visit_duration": 60},
            {"name": "田中様", "address": "東京都練馬区2-2-2", "care_level": models.CareLevelEnum.kaigo3,
             "service_type": models.ServiceTypeEnum.shintai, "visit_duration": 90, "requires_two_staff": True},
            {"name": "佐藤様", "address": "東京都練馬区3-3-3", "care_level": models.CareLevelEnum.shien2,
             "service_type": models.ServiceTypeEnum.kaji, "visit_duration": 60},
            {"name": "山田様", "address": "東京都練馬区4-4-4", "care_level": models.CareLevelEnum.kaigo1,
             "service_type": models.ServiceTypeEnum.seikatsu, "visit_duration": 45},
            {"name": "伊藤様", "address": "東京都練馬区5-5-5", "care_level": models.CareLevelEnum.kaigo4,
             "service_type": models.ServiceTypeEnum.judo, "visit_duration": 120},
            {"name": "渡辺様", "address": "東京都練馬区6-6-6", "care_level": models.CareLevelEnum.kaigo2,
             "service_type": models.ServiceTypeEnum.shogai, "visit_duration": 60},
            {"name": "中村様", "address": "東京都練馬区7-7-7", "care_level": models.CareLevelEnum.kaigo1,
             "service_type": models.ServiceTypeEnum.shintai, "visit_duration": 30},
            {"name": "小林様", "address": "東京都練馬区8-8-8", "care_level": models.CareLevelEnum.shien1,
             "service_type": models.ServiceTypeEnum.kaji, "visit_duration": 60},
        ]

        client_objects = []
        for c in clients_data:
            client = models.Client(
                name=c["name"],
                address=c["address"],
                care_level=c["care_level"],
                service_type=c["service_type"],
                visit_duration=c["visit_duration"],
                requires_two_staff=c.get("requires_two_staff", False),
            )
            db.add(client)
            client_objects.append(client)

        db.flush()

        # ===== ケアプラン登録 =====
        service_type_prices = {
            models.ServiceTypeEnum.shintai: 2500,
            models.ServiceTypeEnum.kaji: 1500,
            models.ServiceTypeEnum.seikatsu: 1500,
            models.ServiceTypeEnum.judo: 3000,
            models.ServiceTypeEnum.shogai: 2000,
        }

        plan_objects = []
        for client in client_objects:
            plan = models.ServicePlan(
                client_id=client.client_id,
                service_type=client.service_type,
                duration_minutes=client.visit_duration,
                requires_two_staff=client.requires_two_staff,
                unit_price=service_type_prices.get(client.service_type, 2000),
            )
            db.add(plan)
            plan_objects.append(plan)

        db.flush()

        # ===== 本日のサンプル訪問データ =====
        today = date.today()
        sample_visits = [
            {"client_idx": 0, "staff_idx": 2, "start_h": 8, "start_m": 0, "duration": 60, "service": models.ServiceTypeEnum.shintai},
            {"client_idx": 1, "staff_idx": 3, "start_h": 9, "start_m": 0, "duration": 90, "service": models.ServiceTypeEnum.shintai, "two_staff": True, "companion_idx": 4},
            {"client_idx": 2, "staff_idx": 4, "start_h": 10, "start_m": 0, "duration": 60, "service": models.ServiceTypeEnum.kaji},
            {"client_idx": 3, "staff_idx": 5, "start_h": 8, "start_m": 30, "duration": 45, "service": models.ServiceTypeEnum.seikatsu},
            {"client_idx": 4, "staff_idx": 6, "start_h": 9, "start_m": 0, "duration": 120, "service": models.ServiceTypeEnum.judo},
            {"client_idx": 5, "staff_idx": 7, "start_h": 10, "start_m": 30, "duration": 60, "service": models.ServiceTypeEnum.shogai},
            {"client_idx": 6, "staff_idx": 2, "start_h": 10, "start_m": 0, "duration": 30, "service": models.ServiceTypeEnum.shintai},
            {"client_idx": 7, "staff_idx": 8, "start_h": 11, "start_m": 0, "duration": 60, "service": models.ServiceTypeEnum.kaji},
            {"client_idx": 0, "staff_idx": 3, "start_h": 14, "start_m": 0, "duration": 60, "service": models.ServiceTypeEnum.shintai},
            {"client_idx": 2, "staff_idx": 9, "start_h": 15, "start_m": 0, "duration": 60, "service": models.ServiceTypeEnum.kaji},
            # 未割当訪問
            {"client_idx": 1, "staff_idx": None, "start_h": 16, "start_m": 0, "duration": 60, "service": models.ServiceTypeEnum.shintai},
            {"client_idx": 3, "staff_idx": None, "start_h": 17, "start_m": 0, "duration": 45, "service": models.ServiceTypeEnum.seikatsu},
        ]

        # ルートオブジェクトキャッシュ
        route_cache = {}

        for sv in sample_visits:
            start_dt = datetime(today.year, today.month, today.day, sv["start_h"], sv["start_m"])
            end_dt = start_dt + timedelta(minutes=sv["duration"])

            staff_id = staff_objects[sv["staff_idx"]].staff_id if sv["staff_idx"] is not None else None
            companion_id = staff_objects[sv["companion_idx"]].staff_id if sv.get("companion_idx") is not None else None

            route_id = None
            if staff_id:
                cache_key = str(staff_id)
                if cache_key not in route_cache:
                    route = models.Route(
                        date=today,
                        staff_id=staff_id,
                        generated_by="seed"
                    )
                    db.add(route)
                    db.flush()
                    route_cache[cache_key] = route
                route_id = route_cache[cache_key].route_id

            visit = models.Visit(
                client_id=client_objects[sv["client_idx"]].client_id,
                staff_id=staff_id,
                companion_staff_id=companion_id,
                route_id=route_id,
                scheduled_start=start_dt,
                scheduled_end=end_dt,
                service_type=sv["service"],
                visit_type="two_staff" if sv.get("two_staff") else "normal",
                status=models.VisitStatusEnum.scheduled,
                date=today,
                plan_id=plan_objects[sv["client_idx"]].plan_id,
            )
            db.add(visit)

        # ===== 売上目標設定 =====
        for staff in staff_objects[2:]:  # スタッフのみ
            target = models.StaffTarget(
                staff_id=staff.staff_id,
                target_type="daily",
                target_amount=15000,
            )
            db.add(target)

        db.commit()
        print("✅ シードデータの投入が完了しました")
        print(f"  スタッフ: {len(staff_data)}名")
        print(f"  利用者: {len(clients_data)}名")
        print(f"  本日の訪問: {len(sample_visits)}件")
        print("\nログイン情報:")
        print("  管理者: admin@ikaruRoute.jp / password123")
        print("  コーディネーター: coordinator@ikaruRoute.jp / password123")
        print("  スタッフ: hino@ikaruRoute.jp / password123")

    except Exception as e:
        db.rollback()
        print(f"❌ エラー: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
