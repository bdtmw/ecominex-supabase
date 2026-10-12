// types/userMachine.ts
export interface UserMachine {
  _id: string;
  
  user: {

    _id: string;
    firstName: string;
    lastName: string;
  };
  machine: {
    _id: string;
    machineName: string;
    status?: string;
  };
  monthlyProfitAccumulated: number;
  status: "active" | "inactive";
}

// types/machineTypes.ts
export interface Machine {
  _id: string;
  machineName: string;
  status?: string;
}
