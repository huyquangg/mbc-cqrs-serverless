import { EventBus, EventHandler, IEventHandler } from '@mbc-cqrs-severless/core'
import { Inject, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ModuleRef } from '@nestjs/core'

import { TaskStatusEnum } from '../enums/status.enum'
import { TASK_QUEUE_EVENT_FACTORY } from '../task.module-definition'
import { TaskService } from '../task.service'
import { TaskQueueEvent } from './task.queue.event'
import { ITaskQueueEventFactory } from './task.queue.event-factory.interface'

@EventHandler(TaskQueueEvent)
export class TaskQueueEventHandler
  implements IEventHandler<TaskQueueEvent>, OnModuleInit
{
  private readonly logger = new Logger(TaskQueueEventHandler.name)
  // We can not inject event module here because of event source can be disabled
  private eventBus: EventBus

  constructor(
    private readonly configService: ConfigService,
    private readonly moduleRef: ModuleRef,
    private readonly taskService: TaskService,
    @Inject(TASK_QUEUE_EVENT_FACTORY)
    private readonly eventFactory: ITaskQueueEventFactory,
  ) {}

  onModuleInit() {
    if (!this.configService.get<boolean>('EVENT_SOURCE_DISABLED')) {
      this.eventBus = this.moduleRef.get(EventBus, { strict: false })
    }
  }

  async execute(event: TaskQueueEvent): Promise<any> {
    this.logger.debug('task queue event executing::', event)

    const taskKey = event.taskEvent.taskKey
    this.logger.debug('task key: ', taskKey)

    try {
      await this.taskService.updateStatus(taskKey, TaskStatusEnum.PROCESSING)
      const events = await this.eventFactory.transformTask(event)
      const result = await Promise.all(
        events.map((event) => this.eventBus.execute(event)),
      )
      // update status completed
      await this.taskService.updateStatus(taskKey, TaskStatusEnum.COMPLETED, {
        result,
      })
    } catch (error) {
      // update status failed
      this.logger.error(error)
      await this.taskService.updateStatus(taskKey, TaskStatusEnum.FAILED, {
        error,
      })
    }
  }
}
