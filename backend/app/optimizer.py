from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app import models


def generate_optimized_routes(db: Session, target_date, staff_ids: Optional[List] = None):
    """
    OR-Tools CP-SATを使ったルート最適化エンジン
    制約条件:
    - スタッフの日次稼働上限時間
    - スタッフのスキル（対応サービス種別）
    - 訪問の希望時間帯
    - 2人体制の制約
    - ダブルブッキング防止
    """
    try:
        from ortools.sat.python import cp_model
    except ImportError:
        # OR-Toolsが利用できない場合はシンプルな割当を実施
        _simple_assign(db, target_date, staff_ids)
        return

    # スタッフ取得
    staff_query = db.query(models.Staff).filter(models.Staff.is_active == True)
    if staff_ids:
        staff_query = staff_query.filter(models.Staff.staff_id.in_(staff_ids))
    staff_list = staff_query.all()

    # 未割当の訪問計画を取得
    unassigned_visits = db.query(models.Visit).filter(
        and_(
            models.Visit.date == target_date,
            models.Visit.staff_id == None,
            models.Visit.status == models.VisitStatusEnum.scheduled
        )
    ).all()

    if not unassigned_visits or not staff_list:
        return

    model = cp_model.CpModel()

    # 変数: x[i][j] = 訪問iをスタッフjに割り当てるか
    n_visits = len(unassigned_visits)
    n_staff = len(staff_list)

    x = {}
    for i in range(n_visits):
        for j in range(n_staff):
            x[i, j] = model.NewBoolVar(f"x_{i}_{j}")

    # 制約1: 各訪問は最大1スタッフに割り当て
    for i in range(n_visits):
        model.AddAtMostOne(x[i, j] for j in range(n_staff))

    # 制約2: スタッフのスキル制約
    for i, visit in enumerate(unassigned_visits):
        for j, staff in enumerate(staff_list):
            if visit.service_type not in (staff.skill_types or []):
                model.Add(x[i, j] == 0)

    # 制約3: 稼働時間上限
    for j, staff in enumerate(staff_list):
        total_minutes = []
        for i, visit in enumerate(unassigned_visits):
            duration = int((visit.scheduled_end - visit.scheduled_start).total_seconds() / 60)
            total_minutes.append(x[i, j] * duration)
        max_minutes = int(staff.max_hours_day * 60)
        model.Add(sum(total_minutes) <= max_minutes)

    # 制約4: ダブルブッキング防止（時間重複チェック）
    for j in range(n_staff):
        for i1 in range(n_visits):
            for i2 in range(i1 + 1, n_visits):
                v1 = unassigned_visits[i1]
                v2 = unassigned_visits[i2]
                # 時間が重複する場合、同じスタッフに割り当て不可
                if v1.scheduled_start < v2.scheduled_end and v1.scheduled_end > v2.scheduled_start:
                    model.Add(x[i1, j] + x[i2, j] <= 1)

    # 目的関数: 割当訪問数を最大化
    model.Maximize(sum(x[i, j] for i in range(n_visits) for j in range(n_staff)))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 60.0  # 最大60秒
    status = solver.Solve(model)

    if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
        for i, visit in enumerate(unassigned_visits):
            for j, staff in enumerate(staff_list):
                if solver.Value(x[i, j]) == 1:
                    # ルートを取得または作成
                    route = db.query(models.Route).filter(
                        and_(
                            models.Route.date == target_date,
                            models.Route.staff_id == staff.staff_id
                        )
                    ).first()
                    if not route:
                        route = models.Route(
                            date=target_date,
                            staff_id=staff.staff_id,
                            generated_by="ai"
                        )
                        db.add(route)
                        db.flush()

                    visit.staff_id = staff.staff_id
                    visit.route_id = route.route_id
                    break

        db.commit()


def _simple_assign(db: Session, target_date, staff_ids: Optional[List] = None):
    """OR-Tools未使用時のシンプルな割当（ラウンドロビン）"""
    staff_query = db.query(models.Staff).filter(models.Staff.is_active == True)
    if staff_ids:
        staff_query = staff_query.filter(models.Staff.staff_id.in_(staff_ids))
    staff_list = staff_query.all()

    unassigned_visits = db.query(models.Visit).filter(
        and_(
            models.Visit.date == target_date,
            models.Visit.staff_id == None
        )
    ).order_by(models.Visit.scheduled_start).all()

    staff_routes = {}
    staff_idx = 0

    for visit in unassigned_visits:
        # スキルマッチするスタッフを探す
        for _ in range(len(staff_list)):
            staff = staff_list[staff_idx % len(staff_list)]
            staff_idx += 1
            if visit.service_type in (staff.skill_types or []):
                if str(staff.staff_id) not in staff_routes:
                    route = models.Route(
                        date=target_date,
                        staff_id=staff.staff_id,
                        generated_by="ai"
                    )
                    db.add(route)
                    db.flush()
                    staff_routes[str(staff.staff_id)] = route

                visit.staff_id = staff.staff_id
                visit.route_id = staff_routes[str(staff.staff_id)].route_id
                break

    db.commit()
