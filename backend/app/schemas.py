"""Validated API request and response contracts."""
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

NonNegativeInt = Annotated[int, Field(strict=True, ge=0)]
PositiveInt = Annotated[int, Field(strict=True, gt=0)]
Pid = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ProcessInput(StrictModel):
    pid: Pid
    arrival: NonNegativeInt
    burst: PositiveInt


class CpuSimulationRequest(StrictModel):
    processes: list[ProcessInput] = Field(min_length=1)
    quantum: PositiveInt = 2
    algorithms: list[Literal["FCFS", "SJF", "RR"]] = Field(default_factory=lambda: ["FCFS", "SJF", "RR"], min_length=1)
    dataset_id: int | None = None

    @model_validator(mode="after")
    def validate_ids_and_algorithms(self):
        ids = [p.pid for p in self.processes]
        if len(ids) != len(set(ids)):
            raise ValueError("process IDs must be unique")
        if len(self.algorithms) != len(set(self.algorithms)):
            raise ValueError("algorithm selections must be unique")
        return self


class MemorySimulationRequest(StrictModel):
    references: list[NonNegativeInt] = Field(min_length=1)
    frames: PositiveInt
    algorithms: list[Literal["FIFO", "LRU", "OPT"]] = Field(default_factory=lambda: ["FIFO", "LRU", "OPT"], min_length=1)
    dataset_id: int | None = None

    @model_validator(mode="after")
    def validate_algorithms(self):
        if len(self.algorithms) != len(set(self.algorithms)):
            raise ValueError("algorithm selections must be unique")
        return self


class DeadlockSimulationRequest(StrictModel):
    available: list[NonNegativeInt] = Field(min_length=1)
    maximum: list[list[NonNegativeInt]] = Field(min_length=1)
    allocation: list[list[NonNegativeInt]] = Field(min_length=1)
    declared_totals: list[NonNegativeInt] | None = None
    dataset_id: int | None = None

    @model_validator(mode="after")
    def validate_matrices_and_totals(self):
        resources = len(self.available)
        if len(self.allocation) != len(self.maximum):
            raise ValueError("allocation and maximum must have the same process count")
        for name, rows in (("maximum", self.maximum), ("allocation", self.allocation)):
            if any(len(row) != resources for row in rows):
                raise ValueError(f"{name} rows must match the {resources} available resource types")
        if any(self.allocation[i][j] > self.maximum[i][j] for i in range(len(self.maximum)) for j in range(resources)):
            raise ValueError("allocation cannot exceed maximum")
        if self.declared_totals is not None:
            if len(self.declared_totals) != resources:
                raise ValueError("declared totals must match the resource count")
            calculated = [self.available[j] + sum(row[j] for row in self.allocation) for j in range(resources)]
            if calculated != self.declared_totals:
                raise ValueError("declared totals must equal available plus allocated resources")
        return self


class DiskSimulationRequest(StrictModel):
    requests: list[NonNegativeInt]
    head: NonNegativeInt
    cylinders: PositiveInt
    direction: Literal["up", "down"] = "up"
    algorithms: list[Literal["FCFS", "SSTF", "SCAN"]] = Field(default_factory=lambda: ["FCFS", "SSTF", "SCAN"], min_length=1)
    dataset_id: int | None = None

    @model_validator(mode="after")
    def validate_positions(self):
        if self.head >= self.cylinders:
            raise ValueError("head must be below cylinders")
        if any(address >= self.cylinders for address in self.requests):
            raise ValueError("all requests must be below cylinders")
        if len(self.algorithms) != len(set(self.algorithms)):
            raise ValueError("algorithm selections must be unique")
        return self


class IntegratedSimulationRequest(StrictModel):
    dataset: dict
    dataset_id: int | None = None


class DatasetWrite(StrictModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
    description: str = ""
    category: Literal["integrated", "cpu", "memory", "deadlock", "storage"]
    config: dict


class DatasetOut(BaseModel):
    id: int
    name: str
    description: str
    category: str
    config: dict
    created_at: str
    updated_at: str


class SimulationOut(BaseModel):
    id: int
    dataset_id: int | None
    category: str
    selected_algorithm: str
    input_snapshot: dict
    result: dict | None
    status: str
    error_message: str | None
    created_at: str
    completed_at: str | None
